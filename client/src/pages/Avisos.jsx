import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAvisosStore } from "../store/avisosStore";
import BlockRenderer from "../components/blocks/BlockRenderer";
import CopyToSetModal from "../components/CopyToSetModal";
import apiUrl, { apiRequest } from "../utils/api"

import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

const CATEGORIES = [
  { id: "admin", label: "📋 Administrativos" },
  { id: "eventos", label: "🎉 Eventos" },
  { id: "pastoral", label: "🙏 Pastoral" },
  { id: "formacion", label: "📚 Formación" },
  { id: "extras", label: "📌 Avisos extra" },
];

const BLOCK_TYPES = [
  "texto",
  "tabla",
  "link",
  "imagen",
  "banco",
  "info",
  "chips",
];

function createBlockFromType(tipo) {
  const nuevoBloque = { tipo };

  if (tipo === "texto") nuevoBloque.contenido = "";
  if (tipo === "lista") nuevoBloque.contenido = ["item"];
  if (tipo === "tabla") nuevoBloque.contenido = [["celda", "celda"]];
  if (tipo === "link") {
    nuevoBloque.texto = "Abrir enlace";
    nuevoBloque.url = "";
  }
  if (tipo === "imagen") {
    nuevoBloque.url = "";
    nuevoBloque.normalizedUrl = "";
  }
  if (tipo === "chips") nuevoBloque.items = ["persona"];
  if (tipo === "info") {
    nuevoBloque.fecha = "dd/mm";
    nuevoBloque.lugar = "Lugar";
    nuevoBloque.horario = "Hora";
  }
  if (tipo === "banco") {
    nuevoBloque.banco = "Banco";
    nuevoBloque.tipoCuenta = "Ahorro";
    nuevoBloque.cuenta = "0000000";
    nuevoBloque.titular = "Titular";
    nuevoBloque.referencia = "Referencia";
  }

  return nuevoBloque;
}

function getBlockDndId(avisoId, bloqueIndex) {
  return `block::${avisoId}::${bloqueIndex}`;
}

function BlockGhostPreview({ bloque }) {
  if (!bloque) return null;

  if (bloque.tipo === "texto") {
    return <p className="canvas-block-text">{bloque.contenido || "Texto"}</p>;
  }

  if (bloque.tipo === "lista") {
    const items = Array.isArray(bloque.contenido) ? bloque.contenido : ["item"];
    return (
      <ul className="canvas-list">
        {items.slice(0, 3).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  if (bloque.tipo === "tabla") {
    const filas = Array.isArray(bloque.contenido) ? bloque.contenido : [["celda"]];
    return (
      <table className="canvas-table">
        <tbody>
          {(filas || []).slice(0, 2).map((fila, i) => (
            <tr key={i}>
              {(Array.isArray(fila) ? fila : Object.values(fila || {}))
                .slice(0, 2)
                .map((celda, j) => (
                  <td key={j}>{celda}</td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (bloque.tipo === "link") {
    return (
      <span className="canvas-link block-template-link">
        <span className="canvas-link-edge" />
        <span className="canvas-link-front">{bloque.texto || "Abrir"}</span>
      </span>
    );
  }

  if (bloque.tipo === "imagen") {
    return (
      <div className="canvas-imagen">
        <div className="block-template-image">Vista previa de imagen</div>
      </div>
    );
  }

  if (bloque.tipo === "banco") {
    return (
      <div className="canvas-banco">
        <div className="canvas-banco-header">💳 Transferencia</div>
        <div className="canvas-banco-row">
          <span className="canvas-banco-label">Banco:</span>
          <span className="canvas-banco-value">{bloque.banco || "Banco"}</span>
        </div>
      </div>
    );
  }

  if (bloque.tipo === "info") {
    return (
      <div className="canvas-info">
        {`📅 ${bloque.fecha || "dd/mm"} | 📍 ${bloque.lugar || "Lugar"} | 🕒 ${bloque.horario || "Hora"}`}
      </div>
    );
  }

  if (bloque.tipo === "chips") {
    const items = Array.isArray(bloque.items) ? bloque.items : ["persona"];
    return (
      <div>
        <div className="canvas-meta">Más información:</div>
        <div className="canvas-chips">
          {items.slice(0, 3).map((chip, i) => (
            <span key={i} className="canvas-chip">
              {chip}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return <pre className="canvas-block-text">{JSON.stringify(bloque, null, 2)}</pre>;
}

function BlockTemplateItem({ tipo, onAdd }) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: `template::${tipo}`,
      data: { kind: "template", tipo },
    });

  const style = {
    opacity: isDragging ? 0.7 : 1,
  };

  const labelMap = {
    texto: "Texto",
    tabla: "Tabla",
    link: "Botón / Link",
    imagen: "Imagen",
    banco: "Banco",
    info: "Info",
    chips: "Chips",
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      className="block-template-card"
      onClick={() => onAdd(tipo)}
      title="Clic para agregar al final o arrastra al aviso"
    >
      <div className="block-template-head">
        <span>{labelMap[tipo] || tipo}</span>
        <span className="block-template-drag" {...attributes} {...listeners}>
          ⋮⋮
        </span>
      </div>

      <div className="block-template-preview">
        {tipo === "texto" && (
          <p className="canvas-block-text">Texto de ejemplo para el aviso.</p>
        )}

        {tipo === "tabla" && (
          <table className="canvas-table">
            <tbody>
              <tr>
                <td>encabezado</td>
                <td>celda</td>
              </tr>
              <tr>
                <td>valor</td>
                <td>valor</td>
              </tr>
            </tbody>
          </table>
        )}

        {tipo === "link" && (
          <span className="canvas-link block-template-link">Abrir enlace</span>
        )}

        {tipo === "imagen" && (
          <div className="canvas-imagen">
            <div className="block-template-image">Vista previa de imagen</div>
          </div>
        )}

        {tipo === "banco" && (
          <div className="canvas-banco">
            <div className="canvas-banco-header">💳 Transferencia</div>
            <div className="canvas-banco-row">
              <span className="canvas-banco-label">Banco:</span>
              <span className="canvas-banco-value">Banco</span>
            </div>
          </div>
        )}

        {tipo === "info" && (
          <div className="canvas-info">📅 dd/mm | 📍 Lugar | 🕒 Hora</div>
        )}

        {tipo === "chips" && (
          <div>
            <div className="canvas-meta">Más información:</div>
            <div className="canvas-chips">
              <span className="canvas-chip">persona</span>
              <span className="canvas-chip">persona</span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

function SortableCanvasBlock({
  avisoId,
  bloqueIndex,
  bloque,
  selectedBlock,
  editingBlock,
  setSelectedBlock,
  setEditingBlock,
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: getBlockDndId(avisoId, bloqueIndex),
    data: { kind: "block", avisoId, bloqueIndex },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="canvas-block-sortable"
    >
      <button
        type="button"
        className="canvas-block-grip"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      <CanvasBlock
        avisoId={avisoId}
        bloqueIndex={bloqueIndex}
        bloque={bloque}
        selectedBlock={selectedBlock}
        editingBlock={editingBlock}
        setSelectedBlock={setSelectedBlock}
        setEditingBlock={setEditingBlock}
      />
    </div>
  );
}

function CanvasBlock({
  avisoId,
  bloqueIndex,
  bloque,
  selectedBlock,
  editingBlock,
  setSelectedBlock,
  setEditingBlock,
}) {
  const isSelected =
    selectedBlock &&
    selectedBlock.avisoId === avisoId &&
    selectedBlock.bloqueIndex === bloqueIndex;

  const isEditing =
    editingBlock &&
    editingBlock.avisoId === avisoId &&
    editingBlock.bloqueIndex === bloqueIndex;

  const handleClick = (e) => {
    e.stopPropagation();
    setSelectedBlock({ avisoId, bloqueIndex });
    if (!isEditing) {
      setEditingBlock(null);
    }
  };

  const enterEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBlock({ avisoId, bloqueIndex });
    setEditingBlock({ avisoId, bloqueIndex });
  };

  if (isEditing) {
    return (
      <div
        className={
          isSelected
            ? "canvas-block canvas-block-editing canvas-block-selected"
            : "canvas-block canvas-block-editing"
        }
        onClick={(e) => e.stopPropagation()}
      >
        <BlockRenderer
          bloque={bloque}
          avisoId={avisoId}
          bloqueIndex={bloqueIndex}
        />
      </div>
    );
  }

  let contenidoVista = null;

  if (bloque.tipo === "texto") {
    contenidoVista = (
      <div
        className="canvas-block-text"
        dangerouslySetInnerHTML={{
          __html: bloque.contenido || "<p>Texto vacío</p>",
        }}
      />
    );
  } else if (bloque.tipo === "lista") {
    const items = bloque.contenido || [];
    contenidoVista = (
      <ul className="canvas-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  } else if (bloque.tipo === "tabla") {
    const filas = bloque.contenido || [];
    contenidoVista = (
      <table className="canvas-table">
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i}>
              {Array.isArray(fila)
                ? fila.map((celda, j) => <td key={j}>{celda}</td>)
                : Object.values(fila || {}).map((celda, j) => (
                    <td key={j}>{celda}</td>
                  ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (bloque.tipo === "link") {
    const texto = bloque.texto || bloque.contenido || "Abrir";
    contenidoVista = (
      <a
        href={bloque.url || "#"}
        className="canvas-link"
        onClick={(e) => e.preventDefault()}
      >
        <span className="canvas-link-edge" />
        <span className="canvas-link-front">{texto}</span>
      </a>
    );
  } else if (bloque.tipo === "info") {
    const partes = [];
    if (bloque.fecha) partes.push(`📅 ${bloque.fecha}`);
    if (bloque.lugar) partes.push(`📍 ${bloque.lugar}`);
    if (bloque.horario) partes.push(`🕒 ${bloque.horario}`);

    contenidoVista = partes.length ? (
      <div className="canvas-info">{partes.join(" | ")}</div>
    ) : (
      <div className="canvas-info vacio">Sin info</div>
    );
  } else if (bloque.tipo === "chips") {
    const items = bloque.items || [];
    contenidoVista = (
      <div>
        <div className="canvas-meta">Más información:</div>
        <div className="canvas-chips">
          {items.map((chip, i) => (
            <span key={i} className="canvas-chip">
              {chip}
            </span>
          ))}
        </div>
      </div>
    );
  } else if (bloque.tipo === "banco") {
    contenidoVista = (
      <div className="canvas-banco">
        <div className="canvas-banco-header">💳 Transferencia</div>
        {bloque.banco && (
          <div className="canvas-banco-row">
            <span className="canvas-banco-label">Banco:</span>
            <span className="canvas-banco-value">{bloque.banco}</span>
          </div>
        )}
        {bloque.tipoCuenta && (
          <div className="canvas-banco-row">
            <span className="canvas-banco-label">Tipo:</span>
            <span className="canvas-banco-value">{bloque.tipoCuenta}</span>
          </div>
        )}
        {bloque.cuenta && (
          <div className="canvas-banco-row">
            <span className="canvas-banco-label">Cuenta:</span>
            <span className="canvas-banco-value">{bloque.cuenta}</span>
          </div>
        )}
        {bloque.titular && (
          <div className="canvas-banco-row">
            <span className="canvas-banco-label">Titular:</span>
            <span className="canvas-banco-value">{bloque.titular}</span>
          </div>
        )}
        {bloque.referencia && (
          <div className="canvas-banco-row">
            <span className="canvas-banco-label">Referencia:</span>
            <span className="canvas-banco-value">{bloque.referencia}</span>
          </div>
        )}
      </div>
    );
  } else if (bloque.tipo === "imagen") {
    const url = bloque.normalizedUrl || bloque.url || "";
    const driveIdMatch = String(bloque.url || url).match(/\/file\/d\/([^/]+)/);
    const driveIdFromQuery = (() => {
      try {
        const u = new URL(String(bloque.url || url));
        return u.searchParams.get("id") || "";
      } catch {
        return "";
      }
    })();
    const driveId = (driveIdMatch && driveIdMatch[1]) || driveIdFromQuery;
    const drivePreviewUrl = driveId
      ? `https://drive.google.com/file/d/${driveId}/preview`
      : "";

    contenidoVista = url ? (
      <div className="canvas-imagen">
        <img
          src={url}
          alt="Imagen de aviso"
          onError={(e) => {
            if (!drivePreviewUrl) return;
            e.currentTarget.style.display = "none";
            const iframe = e.currentTarget.nextElementSibling;
            if (iframe) iframe.style.display = "block";
          }}
        />
        {drivePreviewUrl ? (
          <iframe
            title="Vista previa Drive"
            src={drivePreviewUrl}
            style={{ display: "none" }}
          />
        ) : null}
      </div>
    ) : (
      <div className="canvas-imagen vacio">Imagen sin URL</div>
    );
  } else {
    contenidoVista = (
      <pre className="canvas-block-text">
        {JSON.stringify(bloque, null, 2)}
      </pre>
    );
  }

  return (
    <div
      className={
        isSelected ? "canvas-block canvas-block-selected" : "canvas-block"
      }
      onClick={handleClick}
      onDoubleClick={enterEdit}
    >
      {contenidoVista}
    </div>
  );
}

function SideAvisoItem({ aviso, isActive, onClick, onContextMenu, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: aviso.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      className={isActive ? "aviso-chip aviso-chip-active" : "aviso-chip"}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onContextMenu) onContextMenu(e, aviso);
      }}
    >
      <span className="aviso-chip-title" title={aviso.titulo}>
        {aviso.titulo}
      </span>
      <span className="aviso-chip-count">
        {aviso.bloques?.length || 0} bloques
      </span>
      <span
        className="aviso-chip-handle"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </span>
      {onDelete && (
        <span
          className="aviso-chip-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          ✕
        </span>
      )}
    </button>
  );
}

function CanvasAvisoCard({
  aviso,
  isSelected,
  onSelect,
  onChangeAviso,
  onContextMenu,
  selectedBlock,
  editingBlock,
  setSelectedBlock,
  setEditingBlock,
  dragInsertHint,
}) {
  const dropZoneId = `block-drop::${aviso.id}`;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: aviso.id, data: { kind: "aviso", avisoId: aviso.id } });

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: dropZoneId,
    data: {
      kind: "block-list",
      avisoId: aviso.id,
      insertIndex: aviso.bloques?.length || 0,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const categoria = (aviso.categoria || "extras").toLowerCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`canvas-card ${categoria} ${
        isSelected ? "canvas-card-selected" : ""
      }`}
      onClick={onSelect}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, aviso);
        }
      }}
    >
      <div className="canvas-card-header">
        <button
          type="button"
          className="btn btn-neutral small-btn drag-handle"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          ☰
        </button>

        <div className="canvas-card-title-wrap">
          <input
            className="modern-input"
            value={aviso.titulo || ""}
            onChange={(e) =>
              onChangeAviso(aviso.id, {
                titulo: e.target.value,
              })
            }
            placeholder="Título del aviso"
          />

          <select
            className="modern-input"
            value={categoria}
            onChange={(e) =>
              onChangeAviso(aviso.id, {
                categoria: e.target.value,
              })
            }
          >
            <option value="admin">Admin</option>
            <option value="eventos">Eventos</option>
            <option value="pastoral">Pastoral</option>
            <option value="formacion">Formación</option>
            <option value="extras">Extras</option>
          </select>
        </div>
      </div>

      <div
        ref={setDropNodeRef}
        className={isOver ? "canvas-block-list canvas-block-list-over" : "canvas-block-list"}
      >
        {aviso.bloques?.length ? (
          <SortableContext
            items={(aviso.bloques || []).map((_, index) =>
              getBlockDndId(aviso.id, index),
            )}
            strategy={verticalListSortingStrategy}
          >
            {(aviso.bloques || []).map((bloque, index) => (
              <div key={getBlockDndId(aviso.id, index)}>
                {dragInsertHint &&
                dragInsertHint.avisoId === aviso.id &&
                dragInsertHint.index === index ? (
                  <div className="canvas-block-insert-indicator" />
                ) : null}

                <SortableCanvasBlock
                  avisoId={aviso.id}
                  bloqueIndex={index}
                  bloque={bloque}
                  selectedBlock={selectedBlock}
                  editingBlock={editingBlock}
                  setSelectedBlock={setSelectedBlock}
                  setEditingBlock={setEditingBlock}
                />
              </div>
            ))}

            {dragInsertHint &&
            dragInsertHint.avisoId === aviso.id &&
            dragInsertHint.index === (aviso.bloques || []).length ? (
              <div className="canvas-block-insert-indicator" />
            ) : null}
          </SortableContext>
        ) : (
          <>
            {dragInsertHint && dragInsertHint.avisoId === aviso.id ? (
              <div className="canvas-block-insert-indicator" />
            ) : null}
            <div className="empty-state small">
              Este aviso aún no tiene bloques. Arrastra uno desde la izquierda.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Avisos() {
  const {
    currentSet,
    avisos,
    initializeFromServer,
    setAvisos,
    selectedAvisoId,
    setSelectedAvisoId,
    updateAviso,
    updateCurrentSetMeta,
  } = useAvisosStore();

  const { setId } = useParams();

  const [activeCategory, setActiveCategory] = useState("admin");
  const [contextMenu, setContextMenu] = useState(null);
  const [copyToSetModal, setCopyToSetModal] = useState(null); // { aviso }
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [dragInsertHint, setDragInsertHint] = useState(null);

  const cargarAvisos = useCallback(async () => {
    if (!setId) return;

    const res = await apiRequest(`/avisos?setId=${encodeURIComponent(setId)}`);

    if (!res.ok) {
      console.error("Error cargando avisos del set");
      return;
    }

    const data = await res.json();

    const ordenados = (data.avisos || []).sort(
      (a, b) => (a.orden || 0) - (b.orden || 0),
    );

    initializeFromServer({ avisos: ordenados, set: data.set || null });
  }, [initializeFromServer, setId]);

  useEffect(() => {
    cargarAvisos();
  }, [cargarAvisos]);

  useEffect(() => {
    if (!selectedAvisoId && avisos.length > 0) {
      const first = avisos[0];

      if (!first) return;

      setSelectedAvisoId(first.id);
    }
  }, [avisos, selectedAvisoId, setSelectedAvisoId]);

  const agregarAviso = () => {
    const categoriaNueva = activeCategory || "extras";
    const nuevos = [...avisos];

    const nuevoAviso = {
      id: crypto.randomUUID(),
      orden: nuevos.length + 1,
      titulo: "Nuevo aviso",
      categoria: categoriaNueva,
      bloques: [],
    };

    nuevos.push(nuevoAviso);

    setAvisos(nuevos);
    setSelectedAvisoId(nuevoAviso.id);
  };

  const eliminarAviso = (avisoId) => {
    const filtrados = avisos.filter((a) => a.id !== avisoId);

    const reordenados = filtrados.map((a, i) => ({
      ...a,
      orden: i + 1,
    }));

    setAvisos(reordenados);

    if (selectedAvisoId === avisoId) {
      setSelectedAvisoId(reordenados[0]?.id || null);
    }
  };

  const duplicarAviso = (avisoId) => {
    const index = avisos.findIndex((a) => a.id === avisoId);

    if (index === -1) return;

    const copia = {
      ...avisos[index],
      id: crypto.randomUUID(),
      titulo: `${avisos[index].titulo || "Aviso"} (copia)`,
    };

    const nuevos = [...avisos];

    nuevos.splice(index + 1, 0, copia);

    const reordenados = nuevos.map((a, i) => ({
      ...a,
      orden: i + 1,
    }));

    setAvisos(reordenados);
  };

  function handleCanvasDragEnd(event) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeData = active.data?.current || {};
    const overData = over.data?.current || {};

    if (activeData.kind === "template") {
      const tipo = activeData.tipo;
      const targetAvisoId = overData.avisoId || selectedAvisoId;

      if (!tipo || !targetAvisoId) return;

      const targetAvisoIndex = avisos.findIndex((a) => a.id === targetAvisoId);
      if (targetAvisoIndex === -1) return;

      const nuevosAvisos = [...avisos];
      const avisoTarget = nuevosAvisos[targetAvisoIndex];
      const bloques = [...(avisoTarget.bloques || [])];

      const insertIndex =
        overData.kind === "block"
          ? overData.bloqueIndex
          : overData.insertIndex ?? bloques.length;

      bloques.splice(insertIndex, 0, createBlockFromType(tipo));

      nuevosAvisos[targetAvisoIndex] = {
        ...avisoTarget,
        bloques,
      };

      setAvisos(nuevosAvisos);
      setSelectedAvisoId(targetAvisoId);
      return;
    }

    if (activeData.kind === "block") {
      const sourceAvisoId = activeData.avisoId;
      const targetAvisoId = overData.avisoId;

      if (!sourceAvisoId || !targetAvisoId) return;

      const sourceAvisoIndex = avisos.findIndex((a) => a.id === sourceAvisoId);
      const targetAvisoIndex = avisos.findIndex((a) => a.id === targetAvisoId);

      if (sourceAvisoIndex === -1 || targetAvisoIndex === -1) return;

      const nuevosAvisos = [...avisos];

      const sourceAviso = nuevosAvisos[sourceAvisoIndex];
      const targetAviso = nuevosAvisos[targetAvisoIndex];

      const sourceBloques = [...(sourceAviso.bloques || [])];
      const targetBloques =
        sourceAvisoId === targetAvisoId
          ? sourceBloques
          : [...(targetAviso.bloques || [])];

      const sourceIndex = activeData.bloqueIndex;
      const targetIndex =
        overData.kind === "block"
          ? overData.bloqueIndex
          : overData.insertIndex ?? targetBloques.length;

      if (sourceIndex == null || targetIndex == null) return;

      if (sourceAvisoId === targetAvisoId) {
        const moved = arrayMove(sourceBloques, sourceIndex, targetIndex);
        nuevosAvisos[sourceAvisoIndex] = {
          ...sourceAviso,
          bloques: moved,
        };
      } else {
        const [bloqueMovido] = sourceBloques.splice(sourceIndex, 1);
        if (!bloqueMovido) return;

        targetBloques.splice(targetIndex, 0, bloqueMovido);

        nuevosAvisos[sourceAvisoIndex] = {
          ...sourceAviso,
          bloques: sourceBloques,
        };
        nuevosAvisos[targetAvisoIndex] = {
          ...targetAviso,
          bloques: targetBloques,
        };
      }

      setAvisos(nuevosAvisos);
      setSelectedAvisoId(targetAvisoId);
      return;
    }

    const currentCat = activeCategory;

    const indices = avisos.reduce((acc, aviso, index) => {
      const cat = (aviso.categoria || "extras").toLowerCase();

      if (cat === currentCat) acc.push(index);

      return acc;
    }, []);

    const oldIndexInSlice = indices.findIndex(
      (idx) => avisos[idx].id === active.id,
    );
    const newIndexInSlice = indices.findIndex(
      (idx) => avisos[idx].id === over.id,
    );

    if (oldIndexInSlice === -1 || newIndexInSlice === -1) return;

    const nuevos = [...avisos];
    const subset = indices.map((idx) => nuevos[idx]);
    const moved = arrayMove(subset, oldIndexInSlice, newIndexInSlice);

    indices.forEach((globalIdx, pos) => {
      nuevos[globalIdx] = moved[pos];
    });

    const conOrden = nuevos.map((a, i) => ({
      ...a,
      orden: i + 1,
    }));

    setAvisos(conOrden);
  }

  function handleCanvasDragStart(event) {
    const data = event.active?.data?.current || {};

    if (data.kind === "template") {
      setActiveDragItem({
        kind: "template",
        bloque: createBlockFromType(data.tipo),
      });
      return;
    }

    if (data.kind === "block") {
      const sourceAviso = avisos.find((a) => a.id === data.avisoId);
      const bloque = sourceAviso?.bloques?.[data.bloqueIndex] || null;

      setActiveDragItem({
        kind: "block",
        bloque,
      });
      return;
    }

    setActiveDragItem(null);
  }

  function handleCanvasDragOver(event) {
    const activeData = event.active?.data?.current || {};
    const overData = event.over?.data?.current || {};

    if (!event.over) {
      setDragInsertHint(null);
      return;
    }

    if (activeData.kind !== "template" && activeData.kind !== "block") {
      setDragInsertHint(null);
      return;
    }

    if (!overData.avisoId) {
      setDragInsertHint(null);
      return;
    }

    const index =
      overData.kind === "block"
        ? overData.bloqueIndex
        : overData.insertIndex ?? 0;

    setDragInsertHint({
      avisoId: overData.avisoId,
      index,
    });
  }

  function handleSideDragEnd(event) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = active.id;
    const overId = over.id;

    const activeAviso = avisos.find((a) => a.id === activeId);
    const overAviso = avisos.find((a) => a.id === overId);

    if (!activeAviso || !overAviso) return;

    const fromCat = (activeAviso.categoria || "extras").toLowerCase();
    const toCat = (overAviso.categoria || "extras").toLowerCase();

    const nuevos = [...avisos];

    if (fromCat === toCat) {
      const indices = nuevos.reduce((acc, aviso, index) => {
        const cat = (aviso.categoria || "extras").toLowerCase();

        if (cat === fromCat) acc.push(index);

        return acc;
      }, []);

      const oldIndexInSlice = indices.findIndex(
        (idx) => nuevos[idx].id === activeId,
      );
      const newIndexInSlice = indices.findIndex((idx) => nuevos[idx].id === overId);

      if (oldIndexInSlice === -1 || newIndexInSlice === -1) return;

      const subset = indices.map((idx) => nuevos[idx]);
      const moved = arrayMove(subset, oldIndexInSlice, newIndexInSlice);

      indices.forEach((globalIdx, pos) => {
        nuevos[globalIdx] = moved[pos];
      });
    } else {
      const fromIndex = nuevos.findIndex((a) => a.id === activeId);
      const toIndex = nuevos.findIndex((a) => a.id === overId);

      if (fromIndex === -1 || toIndex === -1) return;

      const updated = {
        ...nuevos[fromIndex],
        categoria: toCat,
      };

      nuevos.splice(fromIndex, 1);

      const newToIndex = nuevos.findIndex((a) => a.id === overId);

      nuevos.splice(newToIndex + 1, 0, updated);
    }

    const conOrden = nuevos.map((a, i) => ({
      ...a,
      orden: i + 1,
    }));

    setAvisos(conOrden);
  }

  const agregarBloque = (tipo) => {
    if (!selectedAvisoId) return;

    const indexAviso = avisos.findIndex(
      (a) => String(a.id) === String(selectedAvisoId),
    );

    if (indexAviso === -1) return;

    const nuevosAvisos = [...avisos];

    nuevosAvisos[indexAviso].bloques.push(createBlockFromType(tipo));

    setAvisos(nuevosAvisos);
  };

  const avisosPorCategoria = avisos.reduce(
    (acc, aviso) => {
      const cat = (aviso.categoria || "extras").toLowerCase();

      if (!acc[cat]) acc[cat] = [];

      acc[cat].push(aviso);

      return acc;
    },
    {},
  );

  const avisoSeleccionado = avisos.find((a) => a.id === selectedAvisoId) || null;

  const avisosCategoriaActiva = avisosPorCategoria[activeCategory] || [];

  return (
    <div
      className="page-card designer-page"
      onClick={() => {
        setContextMenu(null);
        setEditingBlock(null);
      }}
    >
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleCanvasDragStart}
        onDragOver={handleCanvasDragOver}
        onDragEnd={(event) => {
          handleCanvasDragEnd(event);
          setActiveDragItem(null);
          setDragInsertHint(null);
        }}
        onDragCancel={() => {
          setActiveDragItem(null);
          setDragInsertHint(null);
        }}
      >
      <div className="designer-layout">
        {/* Panel izquierdo: paleta de bloques */}
        <div className="designer-left">
          <div className="block-panel">
            <strong className="block-panel-title">Agregar bloque</strong>
            <p className="block-panel-subtitle">
              Arrastra al aviso o haz clic para agregar al final.
            </p>

            <div className="block-template-list">
              {BLOCK_TYPES.map((tipo) => (
                <BlockTemplateItem
                  key={tipo}
                  tipo={tipo}
                  onAdd={agregarBloque}
                />
              ))}

              {!avisoSeleccionado && (
                <div className="empty-state small">
                  Selecciona un aviso para agregar bloques.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel central: canvas tipo template con tabs */}
        <div className="designer-center">
          <div className="canvas-header">
            <div className="canvas-nav">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={
                    activeCategory === cat.id
                      ? "canvas-tab canvas-tab-active"
                      : "canvas-tab"
                  }
                  onClick={() => {
                    setActiveCategory(cat.id);

                    const firstInCat = avisos.find(
                      (a) =>
                        (a.categoria || "extras").toLowerCase() === cat.id,
                    );

                    if (firstInCat) {
                      setSelectedAvisoId(firstInCat.id);
                    }
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-success new-aviso-btn"
              onClick={agregarAviso}
            >
              + Nuevo aviso
            </button>
          </div>

          {avisosCategoriaActiva.length === 0 ? (
            <div className="empty-state">
              No hay avisos en esta categoría.
            </div>
          ) : (
            <SortableContext
              items={avisosCategoriaActiva.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="canvas-section">
                {avisosCategoriaActiva.map((aviso) => (
                  <CanvasAvisoCard
                    key={aviso.id}
                    aviso={aviso}
                    isSelected={aviso.id === selectedAvisoId}
                    onSelect={() => setSelectedAvisoId(aviso.id)}
                    onChangeAviso={updateAviso}
                    onContextMenu={(e, a) =>
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        avisoId: a.id,
                      })
                    }
                    selectedBlock={selectedBlock}
                    editingBlock={editingBlock}
                    setSelectedBlock={setSelectedBlock}
                    setEditingBlock={setEditingBlock}
                    dragInsertHint={dragInsertHint}
                  />
                ))}
              </div>
            </SortableContext>
          )}

          {contextMenu && (
            <div
              className="context-menu"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  duplicarAviso(contextMenu.avisoId);
                  setContextMenu(null);
                }}
              >
                Duplicar aviso
              </button>

              <button
                type="button"
                onClick={() => {
                  const aviso = avisos.find((a) => a.id === contextMenu.avisoId);
                  if (aviso) setCopyToSetModal({ aviso });
                  setContextMenu(null);
                }}
              >
                Copiar a otro set
              </button>

              <button
                type="button"
                className="danger"
                onClick={() => {
                  eliminarAviso(contextMenu.avisoId);
                  setContextMenu(null);
                }}
              >
                Eliminar aviso
              </button>
            </div>
          )}
        </div>

        {/* Panel derecho: listado/meta de avisos */}
        <div className="designer-right">
          <h2 className="side-title">Avisos</h2>

          {currentSet && (
            <div className="banner-msg-field">
              <label className="banner-msg-label">Mensaje final</label>
              <input
                className="modern-input"
                value={currentSet.bannerMessage ?? "Gracias por revisar todos los avisos! Reacciona con un \uD83D\uDEAC si llegaste hasta aqu\u00ED"}
                onChange={(e) => updateCurrentSetMeta({ bannerMessage: e.target.value })}
                placeholder="Mensaje al terminar de leer todos los avisos"
              />
            </div>
          )}

          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleSideDragEnd}
          >
            <div className="avisos-list">
              {CATEGORIES.map((cat) => {
                const lista = avisosPorCategoria[cat.id] || [];

                if (!lista.length) return null;

                return (
                  <SortableContext
                    key={cat.id}
                    items={lista.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="avisos-group">
                      <div className="avisos-group-header">{cat.label}</div>

                      {lista.map((aviso) => {
                        const activo = aviso.id === selectedAvisoId;

                        return (
                          <SideAvisoItem
                            key={aviso.id}
                            aviso={aviso}
                            isActive={activo}
                            onClick={() => {
                              setSelectedAvisoId(aviso.id);
                              setActiveCategory(
                                (aviso.categoria || "extras").toLowerCase(),
                              );
                            }}
                            onDelete={() => eliminarAviso(aviso.id)}
                            onContextMenu={(e, a) =>
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                avisoId: a.id,
                              })
                            }
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                );
              })}
            </div>
          </DndContext>
        </div>
      </div>

      <DragOverlay zIndex={2600}>
        {activeDragItem?.bloque ? (
          <div className="block-drag-overlay">
            <div className="block-drag-overlay-label">
              {activeDragItem.kind === "template" ? "Nuevo bloque" : "Mover bloque"}
            </div>
            <div className="block-drag-overlay-preview">
              <BlockGhostPreview bloque={activeDragItem.bloque} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>

      <CopyToSetModal
        isOpen={!!copyToSetModal}
        aviso={copyToSetModal?.aviso || null}
        currentSetId={currentSet?.id || null}
        onClose={() => setCopyToSetModal(null)}
      />
    </div>
  );
}
