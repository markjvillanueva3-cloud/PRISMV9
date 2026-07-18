import { parsePath, groupByPart, pairAB } from "./lathe-ab-version-locator.mjs";

const paths = [
  "JM DIE/CNC LATHE/ACME/11-10715-0-A.MIN",
  "JM DIE/CNC LATHE/ACME/11-10715-0-B.MIN"
];

const parsed = paths.map(parsePath);
const groups = groupByPart(parsed);
const pairs = pairAB(groups);

console.log(JSON.stringify({
  parsed,
  groupKeys: Object.keys(groups),
  pairs
}, null, 2));
