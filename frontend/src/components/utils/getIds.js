
// Donne le prochain id pour les noeuds feature
export function getNextNodeFeatureId(nodes) {
  const maxId = nodes
    .filter(n => n.type === "feature")
    .reduce((max, node) => {
      const match = String(node.id).match(/[0-9]+/);
      const idNum = match ? parseInt(match[0], 10) : 0;
      return Math.max(max, idNum);
    }, 0);
  return "feature-" + (maxId + 1).toString();
}

// Donne le prochain id pour les noeuds opérateurs
export function getNextNodeOperateurId(nodes) {
  const maxId = nodes
    .filter(n => ["or", "xor", "cardinalite"].includes(n.type))
    .reduce((max, node) => {
      const match = String(node.id).match(/[0-9]+/);
      const idNum = match ? parseInt(match[0], 10) : 0;
      return Math.max(max, idNum);
    }, 0);
  return "operateur-" + (maxId + 1).toString();
}