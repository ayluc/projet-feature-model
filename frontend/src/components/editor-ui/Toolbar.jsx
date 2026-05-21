import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useReactFlow } from "@xyflow/react";
import { useGraphStore } from "@/components/store/GraphStore";
import { Button } from "@/components/shadcn-ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/shadcn-ui/dropdown-menu";
import { Menu, ArrowDownToLine, Plus, Trash2, FileUp, FileDown } from "lucide-react";
import { useModelValidation } from '../utils/useModelValidation';
import CustomPopup from '../popups/CustomPopup';
import CustomToast from "../popups/CustomToast";
import { Input } from "../ui/input";

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
  const [modelName, setModelName] = useState("");

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
    link.download = `${modelName.trim() || "feature-model"}.json`;
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
      if (location.pathname !== "/creation") navigate("/creation");
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
        if (location.pathname !== "/creation") navigate("/creation");
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

  const setPanelOpen = useGraphStore((state) => state.setPanelOpen);
  const setPanelTab = useGraphStore((state) => state.setPanelTab);

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

      <div className="relative flex items-center p-4">
        <div className="flex items-center gap-4">
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
          <Input placeholder="Nommer le feature model" id="feature-model-name" type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex gap-4">
          <Button variant={location.pathname === "/creation" ? "default" : "outline"}
            onClick={() => navigate("/creation")}>
            Création
          </Button>
          <Button
            variant={location.pathname === "/configuration" ? "default" : "outline"}
            onClick={async () => {
              const isValid = await validate();
              if (isValid) {
                navigate("/configuration");
              } else {
                setToast({ type: "warning", message: (<>Le feature model est invalide.{" "}<span onClick={() => { setPanelOpen(true); setPanelTab("validation"); setToast(null); }} style={{ textDecoration: "underline", cursor: "pointer" }}>Vérifiez les règles de validation.</span></>) });
              }
            }}
          >
            Configuration
          </Button>
        </div>

        <div className="ml-auto">
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