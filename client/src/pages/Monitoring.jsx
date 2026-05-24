import { useEffect, useState } from "react";
import {
  DollarSign,
  Coins,
  Activity,
  FileText,
  RefreshCw,
} from "lucide-react";

import apiUrl from "../utils/api";

export default function Monitoring() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);


  async function loadData(showRefresh = false) {
  try {
    setError("");

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const response = await fetch(apiUrl("/monitoring/openai"), {
  credentials: "include",
});

    const text = await response.text();

    console.log("RAW RESPONSE:");
    console.log(text);

    let json;

    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        "El backend no devolvió JSON. Revisa consola del servidor."
      );
    }

    if (!response.ok) {
      throw new Error(json.error || "Error obteniendo monitoring");
    }

    setData(json);
  } catch (err) {
    console.error(err);
    setError(err.message || "Error cargando monitoring");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}

  useEffect(() => {
    loadData();
  }, []);

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              OpenAI Monitoring
            </h1>

            <p className="text-zinc-400 mt-2">
              Estadísticas y consumo de OpenAI
            </p>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 transition px-4 py-2 rounded-xl border border-zinc-700"
          >
            <RefreshCw
              size={18}
              className={refreshing ? "animate-spin" : ""}
            />

            Actualizar
          </button>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
            <div className="animate-pulse text-zinc-400">
              Cargando estadísticas...
            </div>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* CONTENT */}

        {!loading && !error && summary && (
          <>
            {/* CARDS */}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              {/* COST */}

              <Card
                icon={<DollarSign size={22} />}
                title="Costo Total"
                value={`$${summary.totalCostUsd}`}
                subtitle="USD este mes"
              />

              {/* TOKENS */}

              <Card
                icon={<Coins size={22} />}
                title="Tokens Totales"
                value={formatNumber(summary.totalTokens)}
                subtitle="Input + Output"
              />

              {/* INPUT */}

              <Card
                icon={<Activity size={22} />}
                title="Input Tokens"
                value={formatNumber(summary.inputTokens)}
                subtitle="Tokens enviados"
              />

              {/* REQUESTS */}

              <Card
                icon={<FileText size={22} />}
                title="Requests"
                value={formatNumber(summary.totalRequests)}
                subtitle="Peticiones al API"
              />
            </div>

            {/* DETAILS */}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* SUMMARY */}

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                <h2 className="text-2xl font-semibold mb-6">
                  Resumen
                </h2>

                <div className="space-y-4">
                  <InfoRow
                    label="Costo Total"
                    value={`$${summary.totalCostUsd} USD`}
                  />

                  <InfoRow
                    label="Input Tokens"
                    value={formatNumber(summary.inputTokens)}
                  />

                  <InfoRow
                    label="Output Tokens"
                    value={formatNumber(summary.outputTokens)}
                  />

                  <InfoRow
                    label="Total Tokens"
                    value={formatNumber(summary.totalTokens)}
                  />

                  <InfoRow
                    label="Requests"
                    value={formatNumber(summary.totalRequests)}
                  />
                </div>
              </div>

              {/* PERIOD */}

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                <h2 className="text-2xl font-semibold mb-6">
                  Periodo Analizado
                </h2>

                <div className="space-y-4">
                  <InfoRow
                    label="Inicio"
                    value={formatDate(data.period.start)}
                  />

                  <InfoRow
                    label="Fin"
                    value={formatDate(data.period.end)}
                  />

                  <InfoRow
                    label="Actualizado"
                    value={new Date().toLocaleString()}
                  />
                </div>
              </div>
            </div>

            {/* RAW JSON */}

            <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Raw API Response
              </h2>

              <div className="bg-black rounded-2xl p-4 overflow-auto max-h-[500px]">
                <pre className="text-sm text-green-400 whitespace-pre-wrap">
                  {JSON.stringify(data.raw, null, 2)}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===============================
// CARD
// ===============================

function Card({ icon, title, value, subtitle }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-zinc-400">
          {icon}
        </div>
      </div>

      <div className="text-zinc-400 text-sm mb-2">
        {title}
      </div>

      <div className="text-3xl font-bold mb-2">
        {value}
      </div>

      <div className="text-zinc-500 text-sm">
        {subtitle}
      </div>
    </div>
  );
}

// ===============================
// INFO ROW
// ===============================

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
      <span className="text-zinc-400">
        {label}
      </span>

      <span className="font-medium">
        {value}
      </span>
    </div>
  );
}

// ===============================
// HELPERS
// ===============================

function formatNumber(num) {
  return new Intl.NumberFormat().format(num || 0);
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}