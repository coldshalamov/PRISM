"""Server-only Archie tenant GraphQL storage for bounded fictional replay specs.

This client uses only the dedicated prism_demo_record table. No admin API or
OAuth credential belongs in the application runtime.
"""
from __future__ import annotations

import json
import base64
import gzip
import os
from dataclasses import dataclass

import httpx


class StoreUnavailable(Exception):
    pass


class StoreConflict(Exception):
    pass


@dataclass
class Record:
    id: str
    visitor: str
    text: str
    expires: float

    def state(self):
        return json.loads(self.text)


class ArchieStore:
    def __init__(self, endpoint=None, project_id=None, api_key=None, environment=None, auth_prefix=None):
        self.endpoint = endpoint or os.environ.get("ARCHIE_GRAPHQL_ENDPOINT", "https://archie-core.services.archie.com/graphql")
        self.project = project_id or os.environ.get("ARCHIE_PROJECT_ID", "")
        self.key = api_key or os.environ.get("ARCHIE_API_KEY", "")
        self.environment = environment or os.environ.get("ARCHIE_ENVIRONMENT", "master")
        self.prefix = os.environ.get("ARCHIE_AUTH_PREFIX", "") if auth_prefix is None else auth_prefix

    def _query(self, query, variables):
        if not self.project or not self.key:
            raise StoreUnavailable()
        try:
            response = httpx.post(self.endpoint, json={"query": query, "variables": variables},
                                  headers={"Authorization": (self.prefix + " " + self.key).strip(), "X-Project-ID": self.project,
                                           "environment": self.environment}, timeout=15)
            response.raise_for_status()
            payload = response.json()
            if payload.get("errors") or not isinstance(payload.get("data"), dict):
                raise StoreUnavailable()
            return payload["data"]
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            raise StoreUnavailable() from exc

    @staticmethod
    def _record(item):
        return Record(item["id"], item["visitorId"], item["data"], item["expiresAt"])

    def get(self, visitor):
        result = self._query("""query($visitor:String!){prismDemoRecord(first:2,
            filter:{visitorId:{equals:$visitor},kind:{equals:"session"}}){items{id visitorId data expiresAt}}}""",
                             {"visitor": visitor})
        items = result["prismDemoRecord"]["items"]
        if len(items) > 1:
            raise StoreConflict()
        return self._record(items[0]) if items else None

    def create(self, visitor, text, expires):
        result = self._query("""mutation($input:PrismDemoRecordCreateInput!){
            createPrismDemoRecord(input:$input){id visitorId data expiresAt}}""",
                             {"input": {"visitorId": visitor, "kind": "session", "data": text, "expiresAt": expires}})
        return self._record(result["createPrismDemoRecord"])

    def save(self, record, text, expires):
        # Compare-and-swap prevents two cold invocations from silently losing a
        # candidate, bypassing the budget, or resurrecting a cleared session.
        result = self._query("""mutation($filter:PrismDemoRecordFilter!,$data:PrismDemoRecordUpdateInput!){
            updatePrismDemoRecordMany(filter:$filter,data:$data){success totalSucceeded}}""",
                             {"filter": {"id": {"equals": record.id}, "visitorId": {"equals": record.visitor},
                                         "data": {"equals": record.text}},
                              "data": {"data": text, "expiresAt": expires}})["updatePrismDemoRecordMany"]
        if not result["success"] or result["totalSucceeded"] != 1:
            raise StoreConflict()
        return Record(record.id, record.visitor, text, expires)

    def delete(self, record):
        # The ID came from a visitor-filtered lookup, never from browser input.
        result = self._query("mutation($id:String!){deletePrismDemoRecord(id:$id)}", {"id": record.id})
        if not result["deletePrismDemoRecord"]:
            raise StoreConflict()

    def create_blob(self, visitor, content, filename, expires):
        text = json.dumps({"version": 1, "filename": filename,
                           "gzipBase64": base64.b64encode(gzip.compress(content, mtime=0)).decode("ascii")}, separators=(",", ":"))
        result = self._query("""mutation($input:PrismDemoRecordCreateInput!){
            createPrismDemoRecord(input:$input){id visitorId data expiresAt}}""",
                             {"input": {"visitorId": visitor, "kind": "dataset", "data": text, "expiresAt": expires}})
        return self._record(result["createPrismDemoRecord"])

    def get_blob(self, visitor, identifier):
        result = self._query("""query($visitor:String!,$id:String!){prismDemoRecord(first:1,
            filter:{id:{equals:$id},visitorId:{equals:$visitor},kind:{equals:"dataset"}}){items{id visitorId data expiresAt}}}""",
                             {"visitor": visitor, "id": identifier})
        items = result["prismDemoRecord"]["items"]
        return self._record(items[0]) if items else None

    def delete_blob(self, visitor, identifier):
        record = self.get_blob(visitor, identifier)
        if record is not None:
            self.delete(record)
