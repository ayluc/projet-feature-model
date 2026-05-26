import { useState } from 'react';
import { useGraphStore } from '@/components/store/GraphStore';
import CustomPopup from '../popups/CustomPopup';

export const validateGraph = (nodes, edges) => {
	const operatorTypes = ["or", "xor", "cardinalite"];
	const structuralEdges = edges.filter(e => e.data?.liaisonType !== "transverse");

	const childIds = new Set(structuralEdges.map(e => e.target));
	const parentIds = new Set(structuralEdges.map(e => e.source));
	const operators = nodes.filter(n => operatorTypes.includes(n.type));

	// [I2-1] Un nœud ne peut pas être son propre parent
	if (structuralEdges.some(e => e.source === e.target)) return "selfLoop";

	// Aucun nœud sans parent ni enfant
	const isolatedNodes = nodes.filter(n => !parentIds.has(n.id) && !childIds.has(n.id));
	if (isolatedNodes.length > 0) return "isolatedNode";

	// [I2-4] Exactement un nœud racine (sans parent)
	const roots = nodes.filter(n => !childIds.has(n.id));
	if (roots.length !== 1) return "noUniqueRoot";

	// [I2-2] Chaque nœud a au plus un parent
	const hasMultipleParents = [...childIds].some(childId => structuralEdges.filter(e => e.target === childId).length > 1);
	if (hasMultipleParents) return "noSingleParent";

	// [I2-3] Le graphe ne contient pas de cycle 
	const adjList = {};
	structuralEdges.forEach(e => { (adjList[e.source] ??= []).push(e.target); });
	const visited = new Set(), inStack = new Set();
	const hasCycleDFS = (id) => {
		if (inStack.has(id)) return true;
		if (visited.has(id)) return false;
		visited.add(id); inStack.add(id);
		for (const child of (adjList[id] || [])) { if (hasCycleDFS(child)) return true; }
		inStack.delete(id);
		return false;
	};
	if (nodes.some(n => hasCycleDFS(n.id))) return "hasCycle";

	// Deux noeuds opérateurs ne peuvent être en affiliation directe
	const edgesBetweenOperators = structuralEdges.filter(e => operators.some(o => o.id === e.source) && operators.some(o => o.id === e.target));
	if (edgesBetweenOperators.length > 0) return "operatorsLink";

	// Si un nœud a un enfant opérateur, c'est son seul et unique enfant
	const operatorIds = new Set(operators.map(o => o.id));
	const hasOperatorAndOtherChildren = nodes.some(n => {
		const childrenOfN = structuralEdges.filter(e => e.source === n.id).map(e => e.target);
		return childrenOfN.some(c => operatorIds.has(c)) && childrenOfN.length > 1;
	});
	if (hasOperatorAndOtherChildren) return "operatorNotUniqueChild";

	// [I4-4] Un nœud opérateur doit avoir au moins un enfant
	const operatorsWithouChild = nodes.filter(n => operatorTypes.includes(n.type) && !parentIds.has(n.id));
	if (operatorsWithouChild.length > 0) return "noChildOperator";

	const childCountPerParent = {};
	structuralEdges.forEach(e => { childCountPerParent[e.source] = (childCountPerParent[e.source] || 0) + 1; });

	// [I4-1] La borne inférieure de cardinalité ne peut pas dépasser la borne supérieure
	const hasInvalidBounds = nodes.some(n =>
		n.type === "cardinalite" &&
		parseInt(n.data.cardinaliteMin) > parseInt(n.data.cardinaliteMax)
	);
	if (hasInvalidBounds) return "invalidCardinalityBounds";

	// [I4-2] La borne supérieure de cardinalité ne peut pas dépasser le nombre d'enfants
	const hasMaxExceedsChildren = nodes.some(n =>
		n.type === "cardinalite" &&
		parseInt(n.data.cardinaliteMax) > (childCountPerParent[n.id] || 0)
	);
	if (hasMaxExceedsChildren) return "cardinalityMaxExceedsChildren";

	// [I4-2] Le nombre d'enfants doit être au moins égal à la borne inférieure de cardinalité
	const hasTooFewChildren = nodes.some(n => n.data.cardinaliteMin > (childCountPerParent[n.id] || 0));
	if (hasTooFewChildren) return "noEnoughChildren";

	

	return null;
};

export const useModelValidation = (isReadOnly) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [result, setResult] = useState(null);
	const [customPopup, setCustomPopup] = useState(null);

	const setNodes = useGraphStore((state) => state.setNodes);

	// Retourne true si la validation réussit, false sinon
	const validate = async () => {
		const currentNodes = useGraphStore.getState().nodes;
		const currentEdges = useGraphStore.getState().edges;

		setIsLoading(true);
		setError(null);

		const graphError = validateGraph(currentNodes, currentEdges);
		console.log("graphe valide ?", graphError ?? "oui");

		try {

			// ── Mode création ───────────────────────────────────────────
			console.log("Validation du modèle en mode création");

			// Étape 1 : maps pour accès rapide
			const edgeMap = {};
			const parentMap = {};
			currentEdges.forEach(e => {
				if (!edgeMap[e.source]) edgeMap[e.source] = [];
				edgeMap[e.source].push(e.target);
				parentMap[e.target] = e.source;
			});

			const nodeMap = {};
			currentNodes.forEach(n => nodeMap[n.id] = n);

			// Étape 2 : cardinalité héritée des opérateurs
			const operatorTypes = ["or", "xor", "cardinalite"];
			const operatorIds = new Set(
				currentNodes.filter(n => operatorTypes.includes(n.type)).map(n => n.id)
			);

			const inheritedOperator = {};
			operatorIds.forEach(opId => {
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
				inheritedOperator[parentId] = { type: op.type, min, max, operatorId: opId };
			});

			// Étape 3 : nœuds finaux (features uniquement)
			const formattedNodes = currentNodes
				.filter(n => !operatorTypes.includes(n.type))
				.map(n => {
					const numericId = parseInt(String(n.id).match(/\d+/)[0], 10);
					const inherited = inheritedOperator[n.id];
					const formattedNode = { id: numericId, type: "feature" };
					if (inherited) {
						formattedNode.operatorType = inherited.type;
						formattedNode.cardinaliteMin = inherited.min;
						formattedNode.cardinaliteMax = inherited.max;
					}
					return formattedNode;
				});

			// Étape 4 : arcs en court-circuitant les opérateurs
			const formattedArcs = currentEdges
				.filter(e => "isMandatory" in e.data)
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
							: (edge.data.isMandatory ? "mandatory" : "optional"),
					});
					return acc;
				}, []);

			formattedArcs.forEach((a, i) => a.id = i + 1);

			// Étape 5 : liens transverses
			const formattedLinks = currentEdges
				.filter(e => e.data?.liaisonType === "transverse")
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

			const payload = { nodes: formattedNodes, arcs: formattedArcs, links: formattedLinks };
			console.log("Payload création :", JSON.stringify(payload));

			const response = await fetch('http://localhost:8080/validate-creation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Erreur lors de la validation');
			}

			console.log("Réponse création :", data);
			setResult(data);


			let configData = null;
			if (isReadOnly) {
				// ── Mode configuration ──────────────────────────────────────
				console.log("Validation du modèle en mode configuration");

				const formattedNodes = currentNodes
					.filter(node => node.type === "feature")
					.map(node => ({
						id: String(node.id).match(/[0-9]+/)
							? parseInt(String(node.id).match(/[0-9]+/)[0], 10)
							: 1,
						status: node.data?.configStatus || null,
					}));

				const payload = { nodes: formattedNodes };
				console.log("Payload configuration :", payload);

				const response = await fetch('http://localhost:8080/validate-configuration', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});

				configData = await response.json();

				if (!response.ok) {
					throw new Error(configData.error || 'Erreur lors de la validation');
				}

				console.log("Réponse configuration :", configData);

				if (configData.valid && configData.solution) {
					const { isIncluded, isActivated } = configData.solution;

					setNodes((nds) => nds.map((n) => {
						if (n.type === "feature") {
							const match = String(n.id).match(/\d+/);
							const numericId = match ? parseInt(match[0], 10) : null;

							if (numericId && isIncluded[numericId - 1] !== undefined) {
								const active = isActivated[numericId - 1];
								const included = isIncluded[numericId - 1];
								const newStatus = active ? (included ? 'included' : 'excluded') : null;

								const currentSource = n.data?.configSource;
								const newSource = newStatus !== null
									? (currentSource === 'manual' ? 'manual' : 'inferred')
									: null;

								return { ...n, selected: false, data: { ...n.data, configStatus: newStatus, configSource: newSource } };
							}
						}
						return n;
					}));
				}
				setResult(configData);
			}
			const finalData = configData ?? data;
			if (finalData.valid === false) {
				setCustomPopup({ type: "alert", message: "Le feature model est insatisfiable. Veuillez le configurer autrement." });
			}
			return finalData.valid === true && graphError === null;

		} catch (err) {
			console.error("Erreur de validation :", err);
			setError(err.message);
			setResult(null);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { validate, isLoading, error, result, customPopup, setCustomPopup };
};