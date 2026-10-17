import{c as t,j as i,ay as n}from"./index-SL5W1816.js";import{F as c}from"./fingerprint-Df1EtvVc.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=t("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=t("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=t("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]),h={direct_identifier:{label:"Direct identifier",icon:e=>i.jsx(c,{size:e})},quasi_identifier:{label:"Quasi-identifier",icon:e=>i.jsx(o,{size:e})},sensitive:{label:"Sensitive",icon:e=>i.jsx(l,{size:e})},research_target:{label:"Research target",icon:e=>i.jsx(n,{size:e})}};function x({role:e,size:r=13,reserve:s=!1}){const a=e?h[e]:void 0;return!e||!a?s?i.jsx("span",{className:"role-badge ghost","aria-hidden":"true"}):null:i.jsx("span",{className:`role-glyph role-badge r-${e}`,role:"img",title:a.label,"aria-label":a.label,children:a.icon(r)})}export{g as C,o as E,x as R,h as a};
