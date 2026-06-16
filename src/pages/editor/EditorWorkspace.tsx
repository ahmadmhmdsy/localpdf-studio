import Toolbar from '../../components/editor/Toolbar';
import Sidebar from '../../components/editor/Sidebar';
import Canvas from '../../components/editor/Canvas';
import PropertiesPanel from '../../components/editor/PropertiesPanel';

export function EditorWorkspace() {
  return (
    <div className="flex flex-col h-full relative">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  );
}
