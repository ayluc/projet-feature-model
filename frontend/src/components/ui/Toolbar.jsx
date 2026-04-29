import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Menu, ArrowDownToLine, Plus, Trash2, FileUp, FileDown } from "lucide-react";


function Toolbar() {
  return (
    <>
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
                <DropdownMenuItem>
                  <FileUp className="mr-2 h-4 w-4" />
                  <span>Importer</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileDown className="mr-2 h-4 w-4" />
                  <span>Exporter</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div class="col-span-1 flex justify-end">
          <Button>
            Création
          </Button>
        </div>

        <div class="col-span-1 flex justify-start">
          <Button>
            Configuration
          </Button>
        </div>

        <div className="col-span-1 flex justify-end">
          <Button>
            <ArrowDownToLine />
          </Button>
        </div>
      </div>
    </>
  );
}

export default Toolbar;