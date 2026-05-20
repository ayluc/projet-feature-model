import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useReactFlow } from "@xyflow/react";
import { useGraphStore } from "@/components/GraphStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Menu, ArrowDownToLine, Plus, Trash2, FileUp, FileDown } from "lucide-react";
import { useModelValidation } from './utils/useModelValidation';
import CustomPopup from './FeatureModelEditor/CustomPopup';
import CustomToast from "./FeatureModelEditor/CustomToast";

function Toolbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toObject, setViewport } = useReactFlow();
  const setNodes = useGraphStore((state) => state.setNodes);
  const nodes = useGraphStore((state) => state.nodes);
  const setEdges = useGraphStore((state) => state.setEdges);
  const fileInputRef = useRef(null);
  const [customPopup, setCustomPopup] = useState(null);
  const [toast, setToast] = useState(null);

  const showAlert = (message) => {
    setCustomPopup({ type: "alert", message });
  };

  const showConfirm = (message, onConfirm) => {
    setCustomPopup({ type: "confirm", message, onConfirm });
  };

  const handleExport = () => {
    const flowData = toObject();
    const json = JSON.stringify(flowData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "feature-model.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setTimeout(() => {
      fileInputRef.current.click();
    }, 100);
  };

  const handleClear = () => {
    showConfirm("Êtes-vous sûr de vouloir supprimer votre feature model actuel ?", () => {
      setNodes([]);
      setEdges([]);
      setViewport({ x: 0, y: 0, zoom: 1 });
    });
  };

  const doImport = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const flow = JSON.parse(e.target.result);
        setNodes([]);
        setEdges([]);
        setTimeout(() => {
          if (flow.nodes) setNodes(flow.nodes);
          if (flow.edges) setEdges(flow.edges);
          if (flow.viewport) setViewport(flow.viewport);
        }, 50);
      } catch (err) {
        console.error("Fichier JSON invalide :", err);
        showAlert("Le fichier sélectionné n'est pas un JSON valide.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (nodes.length > 0) {
      showConfirm("Êtes-vous sûr de vouloir écraser votre feature model actuel ?", () => doImport(event));
    } else {
      doImport(event);
    }
  };

  const { validate } = useModelValidation(true);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div className="grid grid-row-1 gap-4 grid-cols-4 p-4">
        <div className="col-span-1 flex justify-start">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button />}>
              <Menu />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Feature model</DropdownMenuLabel>
                <DropdownMenuItem onSelect={handleClear}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Effacer</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleImportClick}>
                  <FileUp className="mr-2 h-4 w-4" />
                  <span>Importer</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExport}>
                  <FileDown className="mr-2 h-4 w-4" />
                  <span>Exporter</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="col-span-1 flex justify-end">
          <Button variant={location.pathname === "/creation" ? "default" : "outline"}
            onClick={() => navigate("/creation")}>
            Création
          </Button>
        </div>
        <div className="col-span-1 flex justify-start">
          <Button
            variant={location.pathname === "/configuration" ? "default" : "outline"}
            onClick={async () => {
              const isValid = await validate();
              if (isValid) {
                navigate("/configuration");
              } else {
                setToast({ type: "warning", message: "Le feature model est invalide. Vérifiez qu'il y a une seule racine, pas de nœuds isolés et que tous les opérateurs ont des enfants." });
              }
            }}
          >
            Configuration
          </Button>
        </div>
        <div className="col-span-1 flex justify-end">
          <Button onClick={handleExport}>
            <ArrowDownToLine />
          </Button>
        </div>
      </div>

      <CustomPopup dialog={customPopup} onClose={() => setCustomPopup(null)} />
      <CustomToast dialog={toast} onClose={() => setToast(null)} />
    </>
  );
}

export default Toolbar;