// Port of backend/parser.go Convert() function

export function buildMinizincPayload(nodes, edges) {
  const operatorTypes = ["or", "xor", "cardinalite"];
  const operatorIds = new Set(
    nodes.filter((n) => operatorTypes.includes(n.type)).map((n) => n.id)
  );

  const edgeMap = {};
  const parentMap = {};
  edges.forEach((e) => {
    if (!edgeMap[e.source]) edgeMap[e.source] = [];
    edgeMap[e.source].push(e.target);
    parentMap[e.target] = e.source;
  });

  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  const inheritedOperator = {};
  operatorIds.forEach((opId) => {
    const op = nodeMap[opId];
    const parentId = parentMap[opId];
    if (!parentId) return;
    let min, max;
    if (op.type === "xor") { min = 1; max = 1; }
    else if (op.type === "or") { min = 0; max = (edgeMap[opId] || []).length; }
    else if (op.type === "cardinalite") {
      min = parseInt(op.data?.cardinaliteMin, 10);
      max = parseInt(op.data?.cardinaliteMax, 10);
    }
    inheritedOperator[parentId] = { type: op.type, min, max };
  });

  const formattedNodes = nodes
    .filter((n) => !operatorTypes.includes(n.type))
    .map((n) => {
      const numericId = parseInt(String(n.id).match(/\d+/)[0], 10);
      const inherited = inheritedOperator[n.id];
      const node = { id: numericId, type: "feature" };
      if (inherited) {
        node.operatorType = inherited.type;
        node.cardinaliteMin = inherited.min;
        node.cardinaliteMax = inherited.max;
      }
      return node;
    });

  const formattedArcs = edges
    .filter((e) => "isMandatory" in e.data)
    .reduce((acc, edge) => {
      const { source: sourceId, target: targetId } = edge;
      if (operatorIds.has(targetId)) return acc;
      const realSourceId = operatorIds.has(sourceId) ? parentMap[sourceId] : sourceId;
      if (!realSourceId) return acc;
      acc.push({
        id: 0,
        source: parseInt(String(realSourceId).match(/\d+/)[0], 10),
        target: parseInt(String(targetId).match(/\d+/)[0], 10),
        type: operatorIds.has(sourceId)
          ? "optional"
          : edge.data.isMandatory ? "mandatory" : "optional",
      });
      return acc;
    }, []);
  formattedArcs.forEach((a, i) => (a.id = i + 1));

  const formattedLinks = edges
    .filter((e) => e.data?.liaisonType === "transverse")
    .map((edge, i) => {
      const d = edge.data;
      let type = null;
      if (d.isInclusion) type = "inclusion";
      else if (d.isExclusion) type = "exclusion";
      else if (d.isCompatibility) type = "compatibility";
      else if (d.isEquivalence) type = "equivalence";
      else if (d.isDifference) type = "difference";
      if (!type) return null;
      return {
        id: i + 1,
        source: parseInt(String(edge.source).match(/\d+/)[0], 10),
        target: parseInt(String(edge.target).match(/\d+/)[0], 10),
        type,
      };
    })
    .filter(Boolean);

  return { nodes: formattedNodes, arcs: formattedArcs, links: formattedLinks };
}

export function convertToMinizincDzn(payload) {
  const { nodes, arcs, links } = payload;
  if (!nodes || nodes.length === 0) return "";

  let minID = nodes[0].id, maxID = nodes[0].id;
  for (const n of nodes) {
    if (n.id < minID) minID = n.id;
    if (n.id > maxID) maxID = n.id;
  }

  const nodeById = {};
  for (const n of nodes) nodeById[n.id] = n;

  const children = {};
  const mandatorySet = {};
  const includes = {};
  const excludes = {};
  const compatibles = {};
  const equivalents = {};
  const differents = {};
  const parentOf = {};
  const mandatoryChildCount = {};

  for (const n of nodes) {
    children[n.id] = [];
    includes[n.id] = [];
    excludes[n.id] = [];
    compatibles[n.id] = [];
    equivalents[n.id] = [];
    differents[n.id] = [];
    mandatoryChildCount[n.id] = 0;
  }

  for (const a of arcs) {
    children[a.source].push(a.target);
    parentOf[a.target] = a.source;
    if (a.type === "mandatory") {
      mandatorySet[a.target] = true;
      mandatoryChildCount[a.source] = (mandatoryChildCount[a.source] || 0) + 1;
    }
  }

  for (const n of nodes) {
    if (!(n.id in parentOf)) mandatorySet[n.id] = true;
  }

  for (const l of links || []) {
    const src = l.source, tgt = l.target;
    switch (l.type) {
      case "inclusion":
        includes[src].push(tgt);
        break;
      case "exclusion":
        excludes[src].push(tgt);
        excludes[tgt].push(src);
        break;
      case "compatibility":
        compatibles[src].push(tgt);
        compatibles[tgt].push(src);
        break;
      case "equivalence":
        equivalents[src].push(tgt);
        equivalents[tgt].push(src);
        break;
      case "difference":
        differents[src].push(tgt);
        differents[tgt].push(src);
        break;
    }
  }

  const ids = nodes.map((n) => n.id).sort((a, b) => a - b);
  for (const id of ids) {
    children[id].sort((a, b) => a - b);
    includes[id].sort((a, b) => a - b);
    excludes[id].sort((a, b) => a - b);
    compatibles[id].sort((a, b) => a - b);
    equivalents[id].sort((a, b) => a - b);
    differents[id].sort((a, b) => a - b);
  }

  const formatSet = (vals) =>
    vals.length === 0 ? "{}" : "{" + vals.join(",") + "}";
  const formatList = (map) => ids.map((id) => formatSet(map[id])).join(",");

  const mandatoryParts = ids.map((id) => (mandatorySet[id] ? "1" : "0")).join(",");

  const minChildrenParts = ids.map((id) => {
    const n = nodeById[id];
    const kids = children[id];
    switch (n.operatorType) {
      case "xor": return 1;
      case "or": return 0;
      case "cardinalite": return n.cardinaliteMin ?? 0;
      default: return mandatoryChildCount[id] || 0;
    }
  }).join(",");

  const maxChildrenParts = ids.map((id) => {
    const n = nodeById[id];
    const kids = children[id];
    switch (n.operatorType) {
      case "xor": return 1;
      case "or": return kids.length;
      case "cardinalite": return n.cardinaliteMax ?? kids.length;
      default: return kids.length;
    }
  }).join(",");

  return (
    `FEATURE= ${minID}..${maxID};\n` +
    `children= [${formatList(children)}];\n` +
    `mandatory= [${mandatoryParts}];\n` +
    `includes= [${formatList(includes)}];\n` +
    `excludes= [${formatList(excludes)}];\n` +
    `compatibles= [${formatList(compatibles)}];\n` +
    `equivalents= [${formatList(equivalents)}];\n` +
    `differents= [${formatList(differents)}];\n` +
    `min_children= [${minChildrenParts}];\n` +
    `max_children= [${maxChildrenParts}];\n`
  );
}

export function generateConfigMzn(nodes) {
  const featureNodes = nodes.filter((n) => n.type === "feature");
  let content = 'include "FM.mzn";\n';
  for (const node of featureNodes) {
    const match = String(node.id).match(/[0-9]+/);
    if (!match) continue;
    const numericId = parseInt(match[0], 10);
    const status = node.data?.configStatus;
    if (status) {
      content += `\nconstraint isActivated[${numericId}] == true;\n`;
      content += `constraint isIncluded[${numericId}] == ${status === "included" ? "true" : "false"};\n`;
    }
  }
  return content;
}