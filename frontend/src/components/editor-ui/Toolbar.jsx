import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useReactFlow } from "@xyflow/react";

import { useGraphStore } from "@/components/store/GraphStore";
import { Button } from "@/components/shadcn-ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/shadcn-ui/dropdown-menu";
import { Menu, ArrowDownToLine, Trash2, FileUp, FileDown } from "lucide-react";
import { useModelValidation } from '../utils/useModelValidation';
import CustomPopup from '../popups/CustomPopup';
import CustomToast from "../popups/CustomToast";
import DownloadPopup from "../popups/DownloadPopup";
import { Input } from "../shadcn-ui/input";
import { useDownload } from "../utils/download-utils";

function Toolbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setViewport } = useReactFlow();
  const setNodes = useGraphStore((state) => state.setNodes);
  const nodes = useGraphStore((state) => state.nodes);
  const setEdges = useGraphStore((state) => state.setEdges);
  const fileInputRef = useRef(null);
  const [customPopup, setCustomPopup] = useState(null);
  const [toast, setToast] = useState(null);
  const [modelName, setModelName] = useState("");
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);

  //// POPUPS ////

  const showAlert = (message) => {
    setCustomPopup({ type: "alert", message });
  };

  const showConfirm = (message, onConfirm) => {
    setCustomPopup({ type: "confirm", message, onConfirm });
  };

  //// IMPORT ////

  const handleImportClick = () => {
    setTimeout(() => {
      fileInputRef.current.click();
    }, 100);
  };

  // Import d'un nouveau modèle
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

  // Popup de validation d'import de modèle par dessus le modèle déjà existant
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (nodes.length > 0) {
      showConfirm("Êtes-vous sûr de vouloir écraser votre feature model actuel ?", () => doImport(event));
    } else {
      doImport(event);
    }
  };

  //// EXPORT ////

  // Export du modèle avec comme nom de fichier le nom saisi par l'utilisateur
  const handleDownload = useDownload(modelName);

  //// SUPPRESSION ////

  // Popup de validation de la suppression du modèle existant
  const handleClear = () => {
    showConfirm("Êtes-vous sûr de vouloir supprimer votre feature model actuel ?", () => {
      setNodes([]);
      setEdges([]);
      setViewport({ x: 0, y: 0, zoom: 1 });
      if (location.pathname !== "/creation") navigate("/creation");
    });
  };

  //// VALIDATION DU MODÈLE AVANT DE PASSER EN MODE CONFIGURATION ////

  // Validation du modèle
  const { validate } = useModelValidation(true);

  // Panneau latéral
  const setPanelOpen = useGraphStore((state) => state.setPanelOpen);
  const setPanelTab = useGraphStore((state) => state.setPanelTab);

  //// MODE DALTONIEN ////

  // Mode daltonien
  const isColorblind = useGraphStore((state) => state.isColorblind);
  const setColorblind = useGraphStore((state) => state.setColorblind);

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
                <DropdownMenuItem onSelect={() => setShowDownloadPopup(true)}>
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

        <div className="ml-auto flex items-center gap-3">
          <span>Mode daltonien</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              role="switch"
              checked={isColorblind}
              onChange={(e) => setColorblind(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
          <Button onClick={() => setShowDownloadPopup(true)}>
            <ArrowDownToLine />
          </Button>
        </div>
      </div>
      <CustomPopup dialog={customPopup} onClose={() => setCustomPopup(null)} />
      <CustomToast dialog={toast} onClose={() => setToast(null)} />
      {showDownloadPopup && (
        <DownloadPopup
          onClose={() => setShowDownloadPopup(false)}
          onDownload={handleDownload}
        />
      )}
    </>
  );
}

export default Toolbar;