import{c as y,r as i,j as p}from"./index-DOBxqZqs.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=y("GitCompareArrows",[["circle",{cx:"5",cy:"6",r:"3",key:"1qnov2"}],["path",{d:"M12 6h5a2 2 0 0 1 2 2v7",key:"1yj91y"}],["path",{d:"m15 9-3-3 3-3",key:"1lwv8l"}],["circle",{cx:"19",cy:"18",r:"3",key:"1qljk2"}],["path",{d:"M12 18H7a2 2 0 0 1-2-2V9",key:"16sdep"}],["path",{d:"m9 15 3 3-3 3",key:"1m3kbl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=y("SlidersHorizontal",[["line",{x1:"21",x2:"14",y1:"4",y2:"4",key:"obuewd"}],["line",{x1:"10",x2:"3",y1:"4",y2:"4",key:"1q6298"}],["line",{x1:"21",x2:"12",y1:"12",y2:"12",key:"1iu8h1"}],["line",{x1:"8",x2:"3",y1:"12",y2:"12",key:"ntss68"}],["line",{x1:"21",x2:"16",y1:"20",y2:"20",key:"14d8ph"}],["line",{x1:"12",x2:"3",y1:"20",y2:"20",key:"m0wm8r"}],["line",{x1:"14",x2:"14",y1:"2",y2:"6",key:"14e1ph"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14",key:"1i6ji0"}],["line",{x1:"16",x2:"16",y1:"18",y2:"22",key:"1lctlv"}]]);function d(){const e=i.useRef(null),[n,t]=i.useState(null),r=i.useCallback((c,l,o)=>{var a;const s=(a=e.current)==null?void 0:a.getBoundingClientRect();s&&t({x:c-s.left,y:l-s.top,content:o})},[]),x=i.useCallback((c,l)=>{const o=c.getBoundingClientRect();r(o.left+o.width/2,o.top,l)},[r]),u=i.useCallback(()=>t(null),[]);return{container:e,tip:n,showAt:r,showFor:x,hide:u}}function m({tip:e,width:n}){if(!e)return null;const t=e.x>n*.62;return p.jsx("div",{className:`chart-tip${t?" flip":""}`,style:{left:e.x,top:Math.max(e.y,40)},role:"presentation",children:e.content})}function C(e){if(!(e>0))return 1;const n=Math.pow(10,Math.floor(Math.log10(e))),t=e/n;return(t<=1?1:t<=2?2:t<=2.5?2.5:t<=5?5:10)*n}function w(e,n=4){return Array.from({length:n+1},(t,r)=>e*r/n)}export{m as C,k as G,f as S,C as n,w as t,d as u};
