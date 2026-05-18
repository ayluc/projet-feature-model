package main

import (
	"fmt"
	"sort"
	"strings"
)

// ── Conversion FeatureModel → format cible ───────────────────────────────────
func isOperator(t NodeType) bool {
	return t == NodeTypeOr || t == NodeTypeXor || t == NodeTypeCardinality
}

func Convert(fm FeatureModel) string {
	// 1. Plage des IDs (tous les noeuds)
	minID, maxID := int(fm.Nodes[0].Id), int(fm.Nodes[0].Id)
	for _, n := range fm.Nodes {
		id := int(n.Id)
		if id < minID {
			minID = id
		}
		if id > maxID {
			maxID = id
		}
	}

	// 2. Map id → Node pour accès rapide
	nodeById := make(map[int]Node, len(fm.Nodes))
	for _, n := range fm.Nodes {
		nodeById[int(n.Id)] = n
	}

	// 3. Construction des maps depuis les arcs
	children             := make(map[int][]int)
	mandatorySet         := make(map[int]bool)
	includes           := make(map[int][]int) // inclusion : A => B
	excludes             := make(map[int][]int) // exclusion mutuelle : A /\ B = false (symétrique)
	compatibles         := make(map[int][]int) // compatibilité : A \/ B = true
	equivalents         := make(map[int][]int) // équivalence : A = B (symétrique)
	differents          := make(map[int][]int) // différence : A ≠ B (symétrique)
	parentOf            := make(map[int]int)
	mandatoryChildCount := make(map[int]int)

	for _, n := range fm.Nodes {
		children[int(n.Id)]    = []int{}
		includes[int(n.Id)]  = []int{}
		excludes[int(n.Id)]    = []int{}
		compatibles[int(n.Id)] = []int{}
		equivalents[int(n.Id)] = []int{}
		differents[int(n.Id)]  = []int{}
	}

	// Arcs hiérarchiques (mandatory / optional)
	for _, a := range fm.Arcs {
		children[a.SourceId] = append(children[a.SourceId], a.TargetId)
		parentOf[a.TargetId] = a.SourceId
		if a.Type == "mandatory" {
			mandatorySet[a.TargetId] = true
			mandatoryChildCount[a.SourceId]++
		}
	}

	// La racine est mandatory
	for _, n := range fm.Nodes {
		id := int(n.Id)
		if _, hasParent := parentOf[id]; !hasParent {
			mandatorySet[id] = true
		}
	}

	// Arcs transversaux — les 5 types
	for _, l := range fm.Links {
		src, tgt := l.SourceId, l.TargetId
		switch l.Type {
		case "inclusion":
			// A => B : directionnel, pas symétrique
			includes[src] = append(includes[src], tgt)

		case "exclusion":
			// A /\ B = false : symétrique
			excludes[src] = append(excludes[src], tgt)
			excludes[tgt] = append(excludes[tgt], src)

		case "compatibility":
			// A \/ B = true : directionnel selon FM.mzn
			compatibles[src] = append(compatibles[src], tgt)
			compatibles[tgt] = append(compatibles[tgt], src)

		case "equivalence":
			// A = B : symétrique
			equivalents[src] = append(equivalents[src], tgt)
			equivalents[tgt] = append(equivalents[tgt], src)

		case "difference":
			// A ≠ B : symétrique
			differents[src] = append(differents[src], tgt)
			differents[tgt] = append(differents[tgt], src)
		}
	}

	// Tri pour output déterministe
	for id := range children {
		sort.Ints(children[id])
		sort.Ints(includes[id])
		sort.Ints(excludes[id])
		sort.Ints(compatibles[id])
		sort.Ints(equivalents[id])
		sort.Ints(differents[id])
	}

	// 4. IDs triés
	ids := make([]int, 0, len(fm.Nodes))
	for _, n := range fm.Nodes {
		ids = append(ids, int(n.Id))
	}
	sort.Ints(ids)

	// Helper : formate une map[int][]int en liste de sets MiniZinc
	formatList := func(m map[int][]int) string {
		parts := make([]string, 0, len(ids))
		for _, id := range ids {
			vals := m[id]
			if len(vals) == 0 {
				parts = append(parts, "{}")
			} else {
				strs := make([]string, len(vals))
				for i, v := range vals {
					strs[i] = fmt.Sprintf("%d", v)
				}
				parts = append(parts, "{"+strings.Join(strs, ",")+"}")
			}
		}
		return strings.Join(parts, ",")
	}

	// 5. mandatory
	mandatoryParts := make([]string, 0, len(ids))
	for _, id := range ids {
		if mandatorySet[id] {
			mandatoryParts = append(mandatoryParts, "1")
		} else {
			mandatoryParts = append(mandatoryParts, "0")
		}
	}

	// 6. min_children / max_children
	minChildrenParts := make([]string, 0, len(ids))
	maxChildrenParts := make([]string, 0, len(ids))
	for _, id := range ids {
		n := nodeById[id]
		kids := children[id]
		var minC, maxC int

		switch n.OperatorType {
		case OperatorTypeXor:
			minC = 1
			maxC = 1
		case OperatorTypeOr:
			minC = 0
			maxC = len(kids)
		case OperatorTypeCardinality:
			minC = n.CardinalityMin
			maxC = n.CardinalityMax
		default:
			minC = mandatoryChildCount[id]
			maxC = len(kids)
		}

		minChildrenParts = append(minChildrenParts, fmt.Sprintf("%d", minC))
		maxChildrenParts = append(maxChildrenParts, fmt.Sprintf("%d", maxC))
	}

	return fmt.Sprintf("FEATURE= %d..%d;\n", minID, maxID) +
		fmt.Sprintf("children= [%s];\n", formatList(children)) +
		fmt.Sprintf("mandatory= [%s];\n", strings.Join(mandatoryParts, ",")) +
		fmt.Sprintf("includes= [%s];\n", formatList(includes)) +
		fmt.Sprintf("excludes= [%s];\n", formatList(excludes)) +
		fmt.Sprintf("compatibles= [%s];\n", formatList(compatibles)) +
		fmt.Sprintf("equivalents= [%s];\n", formatList(equivalents)) +
		fmt.Sprintf("differents= [%s];\n", formatList(differents)) +
		fmt.Sprintf("min_children= [%s];\n", strings.Join(minChildrenParts, ",")) +
		fmt.Sprintf("max_children= [%s];\n", strings.Join(maxChildrenParts, ","))
}