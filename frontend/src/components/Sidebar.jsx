import Draggable from "./Draggable";

function Sidebar() {
    return (
        <div className="grid grid-row-5 gap-4 p-4">
            <Draggable id="draggable1" label="Draggable 1" />
            <Draggable id="draggable2" label="Draggable 2" />
            <Draggable id="draggable3" label="Draggable 3" />
            <Draggable id="draggable4" label="Draggable 4" />
            <Draggable id="draggable5" label="Draggable 5" />
        </div>
    );
}

export default Sidebar;