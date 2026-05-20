import { useState } from 'react';
import { useGraphStore } from '@/components/GraphStore';

const validateGraph = (nodes, edges) => {
	const operatorTypes = ["or", "xor", "cardinalite"];

	// Récupère les IDs de tous les noeuds enfants (qui ont un parent)
	const childIds = new Set(edges.map(e => e.target));

	// Tous les noeuds non-opérateurs qui n'ont pas de parent = racines candidates
	const roots = nodes.filter(n => !operatorTypes.includes(n.type) && !childIds.has(n.id));

	// Il doit y avoir exactement une racine
	if (roots.length !== 1) return false;

	// TODO: ajouter d'autres validations ici
	// ex: vérifier qu'aucun nœud feature n'est isolé (sans parent ET sans enfant)
	// ex: vérifier qu'il n'y a pas de cycles

	return true;
};

export const useModelValidation = (isReadOnly) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [result, setResult] = useState(null);

	const setNodes = useGraphStore((state) => state.setNodes);

	// Retourne true si la validation réussit, false sinon
	const validate = async () => {
		const currentNodes = useGraphStore.getState().nodes;
		const currentEdges = useGraphStore.getState().edges;

		setIsLoading(true);
		setError(null);

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

			const isGraphValid = validateGraph(currentNodes, currentEdges);
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

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || 'Erreur lors de la validation');
				}

				console.log("Réponse configuration :", data);

				if (data.valid && data.solution) {
					const { isIncluded, isActivated } = data.solution;

					setNodes((nds) => nds.map((n) => {
						if (n.type === "feature") {
							const match = String(n.id).match(/\d+/);
							const numericId = match ? parseInt(match[0], 10) : null;

							if (numericId && isIncluded[numericId - 1] !== undefined) {
								const active = isActivated[numericId - 1];
								const included = isIncluded[numericId - 1];
								const newStatus = active ? (included ? 'included' : 'excluded') : null;

								return { ...n, data: { ...n.data, configStatus: newStatus } };
							}
						}
						return n;
					}));
				}
				setResult(data);
			}
			return data.valid === true && isGraphValid;

		} catch (err) {
			console.error("Erreur de validation :", err);
			setError(err.message);
			setResult(null);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { validate, isLoading, error, result };
};