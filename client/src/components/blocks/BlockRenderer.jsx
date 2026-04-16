import { useAvisosStore } from "../../store/avisosStore";

import TextoBlock from "./TextoBlock";
import ListaBlock from "./ListaBlock";
import TablaBlock from "./TablaBlock";
import LinkBlock from "./LinkBlock";
import ImagenBlock from "./ImagenBlock";
import BancoBlock from "./BancoBlock";
import InfoBlock from "./InfoBlock";
import ChipsBlock from "./ChipsBlock";

export default function BlockRenderer({ bloque, avisoId, bloqueIndex }) {
  const { avisos, setAvisos } = useAvisosStore();

  const indexAviso = avisos.findIndex((a) => a.id === avisoId);

  const eliminarBloque = () => {
    const nuevosAvisos = [...avisos];

    nuevosAvisos[indexAviso].bloques.splice(bloqueIndex, 1);

    setAvisos(nuevosAvisos);
  };

  const moverArriba = () => {
    if (bloqueIndex === 0) return;

    const nuevosAvisos = [...avisos];

    const bloques = nuevosAvisos[indexAviso].bloques;

    [bloques[bloqueIndex - 1], bloques[bloqueIndex]] = [
      bloques[bloqueIndex],
      bloques[bloqueIndex - 1],
    ];

    setAvisos(nuevosAvisos);
  };

  const moverAbajo = () => {
    const nuevosAvisos = [...avisos];

    const bloques = nuevosAvisos[indexAviso].bloques;

    if (bloqueIndex === bloques.length - 1) return;
    [bloques[bloqueIndex + 1], bloques[bloqueIndex]] = [
      bloques[bloqueIndex],
      bloques[bloqueIndex + 1],
    ];

    setAvisos(nuevosAvisos);
  };

  const renderBloque = () => {
    switch (bloque.tipo) {
      case "texto":
        return (
          <TextoBlock
            bloque={bloque}
            avisoId={avisoId}
            bloqueIndex={bloqueIndex}
          />
        );

      case "lista":
        return (
          <ListaBlock
            bloque={bloque}
            avisoId={avisoId}
            bloqueIndex={bloqueIndex}
          />
        );

      case "tabla":
        return (
          <TablaBlock
            bloque={bloque}
            avisoId={avisoId}
            bloqueIndex={bloqueIndex}
          />
        );

      case "link":
        return (
          <LinkBlock
            bloque={bloque}
            avisoId={avisoId}
            bloqueIndex={bloqueIndex}
          />
        );

      case "imagen":
        return (
          <ImagenBlock
            bloque={bloque}
            avisoId={avisoId}
            bloqueIndex={bloqueIndex}
          />
        );

      case "banco":
        return (
          <BancoBlock
            bloque={bloque}
            avisoId={avisoId}
            bloqueIndex={bloqueIndex}
          />
        );

      case "info":
        return (
          <InfoBlock
            bloque={bloque}
            avisoId={avisoId}
            bloqueIndex={bloqueIndex}
          />
        );

      case "chips":
        return (
          <ChipsBlock
            bloque={bloque}
            avisoId={avisoId}
            bloqueIndex={bloqueIndex}
          />
        );

      default:
        return (
          <pre style={{ fontSize: "12px" }}>
            {JSON.stringify(bloque, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div className="block-shell">
      <div className="block-toolbar">
        <button className="btn btn-neutral small-btn" onClick={moverArriba}>
          ↑
        </button>

        <button className="btn btn-neutral small-btn" onClick={moverAbajo}>
          ↓
        </button>

        <button className="btn btn-danger small-btn" onClick={eliminarBloque}>
          eliminar
        </button>
      </div>

      {renderBloque()}
    </div>
  );
}
