import { useState, useMemo } from 'react';
import { useGraphStore } from '@/components/store/GraphStore';

// Validation du modèle dans le front
// Les règles reprennent les assertions du solveur
const validateGraph = (nodes, edges) => {

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
	if (nodes.length > 0 && roots.length !== 1) return "noUniqueRoot";

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

// Conversion du modèle en un JSON simplifié pour l'envoyer au backend
// Puis validation du modèle par le backend
export const modelValidation = (isReadOnly) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [result, setResult] = useState(null);
	const [customPopup, setCustomPopup] = useState(null);

	const nodes = useGraphStore((state) => state.nodes);
	const edges = useGraphStore((state) => state.edges);
	const setNodes = useGraphStore((state) => state.setNodes);

	// Pré-validation du modèle : si invalide, on s'arrête juste au début de validate et on met en évidence la règle qui invalide le modèle
	const validationError = useMemo(() => validateGraph(nodes, edges), [nodes, edges]);

	// Retourne true si la validation réussit, false sinon
	const validate = async () => {

		if(nodes.length == 0) return true;
		if (validationError !== null) return false;

		const currentNodes = useGraphStore.getState().nodes;
		const currentEdges = useGraphStore.getState().edges;

		setIsLoading(true);
		setError(null);

		try {

			//// MODE CRÉATION ////
			// Validation simple du modèle

			console.log("Validation du modèle en mode création");

			// Étape 1 : création de maps des noeuds et des edges du modèle
			const edgeMap = {};
			const parentMap = {};
			currentEdges.forEach(e => {
				if (!edgeMap[e.source]) edgeMap[e.source] = [];
				edgeMap[e.source].push(e.target);
				parentMap[e.target] = e.source;
			});

			const nodeMap = {};
			currentNodes.forEach(n => nodeMap[n.id] = n);

			// Étape 2 : association des cardinalité des noeuds opérateurs à leur parent (puisque l'affichage des noeuds opérateurs n'est que symbolique)
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

			// Étape 3 : création de la liste finale des noeuds avec leurs données
			const formattedNodes = currentNodes
				.filter(n => !operatorTypes.includes(n.type)) // on retire les noeuds opérateurs qui ne sont pas de vrais noeuds
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

			// Étape 4 : création de la liste des liaisons simples
			const formattedArcs = currentEdges
				.filter(e => "isMandatory" in e.data) // ne prend que les liaisons simples
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

			// Étape 5 : création de la liste des liaisons transverses
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

			const backendJSON = { nodes: formattedNodes, arcs: formattedArcs, links: formattedLinks };
			console.log("JSON à envoyer au backend :", JSON.stringify(backendJSON));

			// Envoi du JSON au backend et réception de sa réponse après validation par le solveur Minizinc
			const response = await fetch('http://localhost:8080/validate-creation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(backendJSON),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Erreur lors de la validation');
			}

			console.log("Réponse création :", data);
			setResult(data);


			let configData = null;
			if (isReadOnly) {

				//// MODE CONFIGURATION ////
				// Validation du modèle + sa configuration pour validation et inférence

				console.log("Validation du modèle en mode configuration");

				// Préparation de la requête à envoyer au back-end
				// Formattage des noeuds : on garde que le nombre de l'id (feature-1 devient 1), et on garde le status (null, included ou excluded)
				const formattedNodes = currentNodes
					.filter(node => node.type === "feature")
					.map(node => ({
						id: String(node.id).match(/[0-9]+/)
							? parseInt(String(node.id).match(/[0-9]+/)[0], 10)
							: 1,
						status: node.data?.configStatus || null,
					}));

				const backendJSON = { nodes: formattedNodes };

				// Envoi de la requête au backend et réception de ses inférences ou de son erreur de validation
				const response = await fetch('http://localhost:8080/validate-configuration', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(backendJSON),
				});

				configData = await response.json();

				if (!response.ok) {
					throw new Error(configData.error || 'Erreur lors de la validation');
				}

				console.log("Réponse configuration :", configData);

				// Application de la solution du solver sur les noeuds : activation des noeuds inférés, et inclusion ou exclusion selon la réponse du solver
				// (On distingue également si un noeud a été inféré ou activé manuellement, pour différencier l'affichage dans le front)
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

			// Si c'est UNSAT alors on prévient l'utilisateur avec une popup.
			if (finalData.valid === false) {
				setCustomPopup({ type: "alert", message: "Le feature model est insatisfiable. Veuillez le configurer autrement." });
			}
			
			return finalData.valid === true;

		} catch (err) {
			console.error("Erreur de validation :", err);
			setError(err.message);
			setResult(null);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { validate, isLoading, error, result, customPopup, setCustomPopup, validationError };
};