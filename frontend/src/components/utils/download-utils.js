import { buildMinizincPayload, convertToMinizincDzn, generateConfigMzn } from "../utils/minizincUtils";
import { toPng } from "html-to-image";
import { getViewportForBounds, useReactFlow } from "@xyflow/react";
import { useGraphStore } from "@/components/store/GraphStore";

const downloadBlob = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

// Export du graphe au format JSON
export const useDownload = (modelName) => {
    const { toObject, getNodes, getNodesBounds } = useReactFlow();
    // Nom du modèle appliqué au fichier : si non personnalisé, le nom par défaut est "feature-model" 
    const baseName = modelName.trim() || "feature-model";

    return (selected) => {
        if (selected.json) {
            const json = JSON.stringify(toObject(), null, 2);
            downloadBlob(json, `${baseName}.json`, "application/json");
        }

        if (selected.image) {
            const PADDING = 0.05;
            const MAX_SIDE = 4096;

            const nodesBounds = getNodesBounds(getNodes());

            let imgW = Math.ceil(nodesBounds.width * (1 + PADDING * 2));
            let imgH = Math.ceil(nodesBounds.height * (1 + PADDING * 2));
            imgW = Math.max(imgW, 1920);
            imgH = Math.max(imgH, 1080);

            if (imgW > MAX_SIDE || imgH > MAX_SIDE) {
                const s = Math.min(MAX_SIDE / imgW, MAX_SIDE / imgH);
                imgW = Math.round(imgW * s);
                imgH = Math.round(imgH * s);
            }

            const viewport = getViewportForBounds(nodesBounds, imgW, imgH, 0.01, 4, PADDING);
            const viewportEl = document.querySelector(".react-flow__viewport");

            if (viewportEl) {
                const edgePaths = Array.from(
                    viewportEl.querySelectorAll(".react-flow__edge-path")
                );
                const savedStrokes = edgePaths.map((p) => p.style.stroke);
                edgePaths.forEach((p) => {
                    if (!p.style.stroke) {
                        p.style.stroke = window.getComputedStyle(p).stroke || "#b1b1b7";
                    }
                });
                const restoreStrokes = () =>
                    edgePaths.forEach((p, i) => { p.style.stroke = savedStrokes[i]; });

                toPng(viewportEl, {
                    backgroundColor: "#ffffff",
                    width: imgW,
                    height: imgH,
                    fontEmbedCSS: "",
                    style: {
                        width: imgW,
                        height: imgH,
                        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                    },
                }).then((dataUrl) => {
                    restoreStrokes();
                    const a = document.createElement("a");
                    a.download = `${baseName}.png`;
                    a.href = dataUrl;
                    a.click();
                }).catch(restoreStrokes);
            }
        }

        if (selected.dzn) {
            const currentNodes = useGraphStore.getState().nodes;
            const currentEdges = useGraphStore.getState().edges;
            const payload = buildMinizincPayload(currentNodes, currentEdges);
            const dzn = convertToMinizincDzn(payload);
            downloadBlob(dzn, `${baseName}-feature-model.dzn`, "text/plain");
        }

        if (selected.mzn) {
            const currentNodes = useGraphStore.getState().nodes;
            const mzn = generateConfigMzn(currentNodes);
            downloadBlob(mzn, `${baseName}-configuration.mzn`, "text/plain");
        }
    };
};
