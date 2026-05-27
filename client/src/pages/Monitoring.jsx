import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Coins,
  Activity,
  FileText,
  RefreshCw,
  Wallet,
  TrendingUp,
  BarChart3,
  Clock3,
} from "lucide-react";

import apiUrl from "../utils/api";
import "../styles/monitoring.css";

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

      let json;

      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(
          "El backend no devolvió JSON. Revisa consola del servidor.",
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
  const executive = data?.executive;

  const remainingBalance = useMemo(() => {
    if (!executive) return 0;

    return Math.max(Number(executive.remainingCredits || 0), 0);
  }, [executive]);

  const costPer1kTokens = useMemo(() => {
    if (!summary?.totalTokens) return 0;

    return (summary.totalCostUsd / summary.totalTokens) * 1000;
  }, [summary]);

  return (
    <div className="monitoring-page">
      <div className="monitoring-container">
        {/* HEADER */}

        <div className="monitoring-header">
          <div>
            <div className="monitoring-badge">
              <Activity size={14} />
              OPENAI PLATFORM MONITORING
            </div>

            <h1 className="monitoring-title">Dashboard de Consumo</h1>

            <p className="monitoring-subtitle">
              Métricas ejecutivas, costos, consumo de tokens y actividad
              histórica de tu infraestructura OpenAI.
            </p>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="refresh-button"
          >
            <RefreshCw size={18} className={refreshing ? "spin" : ""} />
            Actualizar
          </button>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="loading-card">
            <div className="loading-text">
              Cargando estadísticas de OpenAI...
            </div>
          </div>
        )}

        {/* ERROR */}

        {error && <div className="error-card">{error}</div>}

        {/* CONTENT */}

        {!loading && !error && summary && (
          <>
            {/* HERO */}

            <div className="hero-grid">
              {/* BALANCE */}

              <div className="hero-balance card">
                <div className="hero-glow" />

                <div className="hero-content">
                  <div className="hero-top">
                    <div className="hero-icon green">
                      <Wallet size={26} />
                    </div>

                    <div>
                      <div className="hero-label">Balance Disponible</div>

                      <div className="hero-small">
                        Créditos restantes estimados
                      </div>
                    </div>
                  </div>

                  <div className="hero-amount">
                    ${formatMoney(remainingBalance)}
                  </div>

                  <div className="pill-row">
                    <MiniPill
                      label="Gastado este mes"
                      value={`$${formatMoney(summary.totalCostUsd)}`}
                    />

                    <MiniPill
                      label="Promedio por request"
                      value={`$${formatMoney(summary.averageCostPerRequest)}`}
                    />

                    <MiniPill
                      label="Costo por 1K tokens"
                      value={`$${formatMoney(costPer1kTokens)}`}
                    />
                    <MiniPill
                      label="Consultas restantes"
                      value={formatNumber(summary.estimatedRequestsRemaining)}
                    />
                  </div>
                </div>
              </div>

              {/* ACTIVITY */}

              <div className="card activity-card">
                <div className="card-header">
                  <div className="hero-icon blue">
                    <TrendingUp size={22} />
                  </div>

                  <div>
                    <div className="card-title">Actividad</div>

                    <div className="card-subtitle">Periodo actual</div>
                  </div>
                </div>

                <div className="metrics-list">
                  <MetricRow
                    label="Requests"
                    value={formatNumber(summary.totalRequests)}
                  />

                  <MetricRow
                    label="Tokens Totales"
                    value={formatNumber(summary.totalTokens)}
                  />

                  <MetricRow
                    label="Input Tokens"
                    value={formatNumber(summary.inputTokens)}
                  />

                  <MetricRow
                    label="Output Tokens"
                    value={formatNumber(summary.outputTokens)}
                  />
                </div>
              </div>
            </div>

            {/* STATS */}

            <div className="stats-grid">
              <StatCard
                icon={<DollarSign size={22} />}
                title="Costo Total"
                value={`$${formatMoney(summary.totalCostUsd)}`}
                subtitle="USD consumidos"
              />

              <StatCard
                icon={<Coins size={22} />}
                title="Tokens"
                value={formatNumber(summary.totalTokens)}
                subtitle="Input + Output"
              />

              <StatCard
                icon={<FileText size={22} />}
                title="Requests"
                value={formatNumber(summary.totalRequests)}
                subtitle="Consultas realizadas"
              />

              <StatCard
                icon={<BarChart3 size={22} />}
                title="Costo / Request"
                value={`$${formatMoney(summary.averageCostPerRequest)}`}
                subtitle="Promedio estimado"
              />
            </div>

            {/* DETAILS */}

            <div className="details-grid">
              {/* EXEC */}

              <div className="card detail-card">
                <div className="section-header">
                  <Clock3 size={20} />
                  <h2>Resumen Ejecutivo</h2>
                </div>

                <div className="info-list">
                  <InfoRow
                    label="Balance restante"
                    value={`$${formatMoney(remainingBalance)} USD`}
                  />

                  <InfoRow
                    label="Costo total"
                    value={`$${formatMoney(summary.totalCostUsd)} USD`}
                  />

                  <InfoRow
                    label="Promedio por request"
                    value={`$${formatMoney(summary.averageCostPerRequest)}`}
                  />

                  <InfoRow
                    label="Costo por 1K tokens"
                    value={`$${formatMoney(costPer1kTokens)}`}
                  />

                  <InfoRow
                    label="Total tokens"
                    value={formatNumber(summary.totalTokens)}
                  />
                </div>
              </div>

              {/* PERIOD */}

              <div className="card detail-card">
                <div className="section-header">
                  <Activity size={20} />
                  <h2>Periodo Analizado</h2>
                </div>

                <div className="info-list">
                  <InfoRow
                    label="Inicio"
                    value={formatDate(data.period.start)}
                  />

                  <InfoRow label="Fin" value={formatDate(data.period.end)} />

                  <InfoRow
                    label="Actualizado"
                    value={new Date().toLocaleString()}
                  />
                </div>
              </div>
            </div>

            {/* RAW */}

            <div className="card raw-card">
              <div className="raw-header">
                <div>
                  <h2>Raw API Response</h2>

                  <p>Datos completos retornados por OpenAI</p>
                </div>
              </div>

              <div className="raw-body">
                <pre>{JSON.stringify(data.raw, null, 2)}</pre>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===============================
   STAT CARD
=============================== */

function StatCard({ icon, title, value, subtitle }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon">{icon}</div>

      <div className="stat-title">{title}</div>

      <div className="stat-value">{value}</div>

      <div className="stat-subtitle">{subtitle}</div>
    </div>
  );
}

/* ===============================
   MINI PILL
=============================== */

function MiniPill({ label, value }) {
  return (
    <div className="mini-pill">
      <div className="mini-pill-label">{label}</div>

      <div className="mini-pill-value">{value}</div>
    </div>
  );
}

/* ===============================
   INFO ROW
=============================== */

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>

      <span className="info-value">{value}</span>
    </div>
  );
}

/* ===============================
   METRIC ROW
=============================== */

function MetricRow({ label, value }) {
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>

      <span className="metric-value">{value}</span>
    </div>
  );
}

/* ===============================
   HELPERS
=============================== */

function formatNumber(num) {
  return new Intl.NumberFormat().format(num || 0);
}

function formatMoney(num) {
  return Number(num || 0).toFixed(2);
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}
