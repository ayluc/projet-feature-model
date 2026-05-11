package main

import (
	"fmt"
	"sort"
	"strings"
)

// ── Conversion FeatureModel → format cible ───────────────────────────────────

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

	// 2. Construction des maps depuis les arcs
	children      := make(map[int][]int)
	mandatorySet  := make(map[int]bool)
	incompatibles := make(map[int][]int)
	dependents    := make(map[int][]int)

	for _, n := range fm.Nodes {
		children[int(n.Id)]      = []int{}
		incompatibles[int(n.Id)] = []int{}
		dependents[int(n.Id)]    = []int{}
	}
	for _, a := range fm.Arcs {
		children[a.SourceId] = append(children[a.SourceId], a.TargetId)
		if a.Type == "mandatory" {
			mandatorySet[a.TargetId] = true
		}
		if a.Type == "exclusion" {
			incompatibles[a.SourceId] = append(incompatibles[a.SourceId], a.TargetId)
		}
		if a.Type == "dependancy" {
			dependents[a.SourceId] = append(dependents[a.SourceId], a.TargetId)
		}
	}
	for id := range children {
		sort.Ints(children[id])
		sort.Ints(incompatibles[id])
		sort.Ints(dependents[id])
	}

	// 3. IDs triés
	ids := make([]int, 0, len(fm.Nodes))
	for _, n := range fm.Nodes {
		ids = append(ids, int(n.Id))
	}
	sort.Ints(ids)

	// Helper : formate une map[int][]int en liste de {x,y} ou {}
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

	// 4. mandatory
	mandatoryParts := make([]string, 0, len(ids))
	for _, id := range ids {
		if mandatorySet[id] {
			mandatoryParts = append(mandatoryParts, "1")
		} else {
			mandatoryParts = append(mandatoryParts, "0")
		}
	}

	return fmt.Sprintf("FEATURE= %d..%d;\n", minID, maxID) +
		fmt.Sprintf("children= [%s]\n", formatList(children)) +
		fmt.Sprintf("mandatory= [%s];\n", strings.Join(mandatoryParts, ",")) +
		fmt.Sprintf("dependents= [%s];\n", formatList(dependents)) +
		fmt.Sprintf("incompatibles= [%s];\n", formatList(incompatibles))
}