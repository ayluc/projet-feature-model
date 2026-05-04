import { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useReactFlow } from "@xyflow/react";
import { useGraphStore } from "@/components/GraphStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Menu, ArrowDownToLine, Plus, Trash2, FileUp, FileDown } from "lucide-react";

function Toolbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toObject, setViewport } = useReactFlow();
  const setNodes = useGraphStore((state) => state.setNodes);
  const setEdges = useGraphStore((state) => state.setEdges);
  const fileInputRef = useRef(null);

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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

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
        alert("Le fichier sélectionné n'est pas un JSON valide.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

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
                <DropdownMenuItem>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Nouveau</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Supprimer</span>
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
          <Button variant={location.pathname === "/configuration" ? "default" : "outline"}
            onClick={() => navigate("/configuration")}>
            Configuration
          </Button>
        </div>
        <div className="col-span-1 flex justify-end">
          <Button onClick={handleExport}>
            <ArrowDownToLine />
          </Button>
        </div>
      </div>
    </>
  );
}

export default Toolbar;