import React, { useState } from 'react';
import { uploadDataForIngestion, triggerDiagnosticAgent, triggerVisualizationAgent, triggerStrategyAgent, triggerAuditorAgent, triggerSimulationAgent, triggerDeploymentAgent } from './api';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#FCA5A5', backgroundColor: '#374151', borderRadius: '8px', textAlign: 'center', border: '1px dashed #EF4444', width: '100%', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Visualization Render Failed</p>
            <span style={{ fontSize: '12px', color: '#D1D5DB' }}>The AI generated an incompatible data sequence.</span>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PIE_COLORS = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6'];

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState(null);
  
  const [strategyConfig, setStrategyConfig] = useState(null);
  const [auditConfig, setAuditConfig] = useState(null);
  const [simulationConfig, setSimulationConfig] = useState(null);
  const [deploymentConfig, setDeploymentConfig] = useState(null);
  
  const [activeAgentName, setActiveAgentName] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleFileChange = (e) => setFiles(Array.from(e.target.files));

  const runPipelineEngine = async () => {
    if (files.length === 0) return alert("Please select datasets to process.");
    
    setLoading(true); setIsComplete(false); setHasError(false);
    setDashboardConfig(null); setStrategyConfig(null); setAuditConfig(null); setSimulationConfig(null); setDeploymentConfig(null);
    
    try {
      setActiveAgentName("Data Architect (Mapping Datasets...)");
      const ingestData = await uploadDataForIngestion(files);
      if (ingestData.status !== "success") throw new Error(ingestData.message);
      
      setActiveAgentName("Diagnostic Engine (Analyzing Bottlenecks...)");
      const diagnosticData = await triggerDiagnosticAgent(ingestData.record_id);
      if (diagnosticData.status !== "success") throw new Error(diagnosticData.message);
          
      setActiveAgentName("Dynamic Visualizer (Architecting Schemas...)");
      const visualData = await triggerVisualizationAgent(ingestData.record_id, diagnosticData.diagnosis);
      if (visualData.status !== "success") throw new Error(visualData.message);
      setDashboardConfig(visualData.chart_config);
              
      setActiveAgentName("Cognitive CMO (Building Strategy Framework...)");
      const strategyData = await triggerStrategyAgent(ingestData.record_id, diagnosticData.diagnosis);
      if (strategyData.status !== "success") throw new Error(strategyData.message);
      setStrategyConfig(strategyData.strategy);
                  
      setActiveAgentName("QA Red Team (Auditing Viability...)");
      const auditData = await triggerAuditorAgent(ingestData.record_id, strategyData.strategy);
      if (auditData.status !== "success") throw new Error(auditData.message);
      setAuditConfig(auditData.audit);
      
      setActiveAgentName("Quant Simulator (Running Bayesian Models...)");
      const simData = await triggerSimulationAgent(ingestData.record_id, strategyData.strategy);
      if (simData.status !== "success") throw new Error(simData.message);
      setSimulationConfig(simData.simulation);
      
      setActiveAgentName("Elite Copywriter (Synthesizing Assets...)");
      const deployData = await triggerDeploymentAgent(ingestData.record_id, strategyData.strategy);
      if (deployData.status !== "success") throw new Error(deployData.message);
      setDeploymentConfig(deployData.assets);
      
      setIsComplete(true);
      setActiveAgentName("");

    } catch (err) {
      setHasError(true);
      setActiveAgentName(`System Failure: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  let safeKpis = []; let safeCharts = [];
  if (dashboardConfig) {
      safeKpis = dashboardConfig.kpis || dashboardConfig.KPIs || dashboardConfig.Kpis || [];
      if (dashboardConfig.charts && Array.isArray(dashboardConfig.charts)) safeCharts = dashboardConfig.charts;
      else if (dashboardConfig.chartType) safeCharts = [dashboardConfig];
  }

  return (
    <div style={{ padding: '30px', backgroundColor: '#090D16', color: '#E5E7EB', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1F2937', paddingBottom: '20px', marginBottom: '25px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#F3F4F6', letterSpacing: '-0.5px' }}>APEX <span style={{color: '#0EA5E9'}}>// OS</span></h1>
          <p style={{ margin: '4px 0 0 0', color: '#9CA3AF', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Autonomous Marketing Intelligence</p>
        </div>
      </header>

      <div style={{ display: 'grid', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        
        <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '15px 25px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <input type="file" multiple onChange={handleFileChange} style={{ color: '#9CA3AF', cursor: 'pointer', fontSize: '14px', backgroundColor: '#0B0F19', padding: '10px', borderRadius: '6px', border: '1px solid #1F2937' }} />
                <button onClick={runPipelineEngine} disabled={loading} style={{ padding: '10px 24px', backgroundColor: loading ? '#374151' : '#0EA5E9', color: '#FFF', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', transition: '0.2s' }}>
                    {loading ? "System Engaged..." : "Execute Pipeline"}
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#0B0F19', padding: '10px 20px', borderRadius: '30px', border: '1px solid #1F2937' }}>
                {loading ? (
                    <>
                        <div style={{ width: '8px', height: '8px', backgroundColor: '#0EA5E9', borderRadius: '50%', boxShadow: '0 0 8px #0EA5E9', animation: 'pulse 1.5s infinite' }}></div>
                        <span style={{ fontSize: '13px', color: '#0EA5E9', fontWeight: '600' }}>{activeAgentName}</span>
                    </>
                ) : hasError ? (
                    <>
                        <div style={{ width: '8px', height: '8px', backgroundColor: '#EF4444', borderRadius: '50%', boxShadow: '0 0 8px #EF4444' }}></div>
                        <span style={{ fontSize: '13px', color: '#EF4444', fontWeight: '600' }}>{activeAgentName}</span>
                    </>
                ) : isComplete ? (
                    <>
                        <div style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', boxShadow: '0 0 8px #10B981' }}></div>
                        <span style={{ fontSize: '13px', color: '#10B981', fontWeight: '600' }}>All Agents Successfully Deployed</span>
                    </>
                ) : (
                    <>
                        <div style={{ width: '8px', height: '8px', backgroundColor: '#4B5563', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>System Standby</span>
                    </>
                )}
            </div>
            <style>{`@keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }`}</style>
        </div>

        {/* --- DYNAMIC DASHBOARD AREA --- */}
        {dashboardConfig && (
          <div style={{ backgroundColor: '#0B0F19', border: '1px solid #1F2937', padding: '25px', borderRadius: '10px' }}>
            <h3 style={{ marginTop: 0, color: '#F3F4F6', fontSize: '20px', borderBottom: '1px solid #1F2937', paddingBottom: '15px', marginBottom: '20px' }}>Executive Analytics</h3>
            
            {safeKpis.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {safeKpis.map((kpi, index) => {
                    const trendStr = String(kpi.trend || "");
                    const isNegative = trendStr.includes('-');
                    return (
                      <div key={index} style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #0EA5E9' }}>
                        <p style={{ margin: '0 0 5px 0', color: '#9CA3AF', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>{kpi.label || "Metric"}</p>
                        <h2 style={{ margin: 0, color: '#F3F4F6', fontSize: '26px' }}>{kpi.value || "0"}</h2>
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: isNegative ? '#10B981' : '#EF4444', fontWeight: '500' }}>{trendStr} {trendStr && "vs prior"}</p>
                      </div>
                    );
                })}
                </div>
            )}

            {safeCharts.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', justifyContent: 'center' }}>
                {safeCharts.map((chart, index) => {
                    let rawData = [];
                    if (Array.isArray(chart.data)) {
                        rawData = chart.data;
                    } else {
                        for (const key in chart) {
                            if (Array.isArray(chart[key]) && chart[key].length > 0) {
                                rawData = chart[key];
                                break;
                            }
                        }
                    }

                    const requestedType = String(chart.chartType).toLowerCase();
                    const dynamicXName = chart.xAxisKey || "Category";
                    const dynamicYName = chart.dataKey || "Value";

                    const safeData = rawData.map((item, i) => {
                        let xVal = `Item ${i + 1}`;
                        let yVal = 0;
                        if (typeof item !== 'object' || item === null) return { name: String(xVal), value: Number(item) || 0 };

                        const keys = Object.keys(item);
                        let foundString = false;
                        let foundNumber = false;

                        for (const k of keys) {
                            const val = item[k];
                            const numVal = Number(val);
                            if (typeof val === 'string' && isNaN(numVal) && !foundString) {
                                xVal = val; foundString = true;
                            } else if (!isNaN(numVal) && !foundNumber) {
                                yVal = numVal; foundNumber = true;
                            }
                        }

                        if (!foundString && keys.length > 0) xVal = String(item[keys[0]]);
                        if (!foundNumber && keys.length > 1) yVal = Number(item[keys[1]]) || 0;
                        else if (!foundNumber && keys.length === 1) yVal = Number(item[keys[0]]) || 0;

                        return { name: String(xVal), value: yVal };
                    });

                    return (
                    <div key={index} style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h4 style={{ margin: '0 0 20px 0', color: '#E5E7EB', fontSize: '14px', fontWeight: '600', width: '100%', textAlign: 'left' }}>{chart.title || "Data Visualization"}</h4>
                        
                        <div style={{ height: '300px', width: '100%', paddingTop: '10px' }}>
                            <ChartErrorBoundary>
                                <ResponsiveContainer width="100%" height="100%">
                                    {requestedType.includes('pie') ? (
                                        <PieChart>
                                            <Pie data={safeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" nameKey="name" stroke="none">
                                                {safeData.map((entry, i) => (
                                                    <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
                                        </PieChart>
                                    ) : requestedType.includes('line') ? (
                                        <LineChart data={safeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                            <XAxis dataKey="name" stroke="#6B7280" fontSize={11} label={{ value: dynamicXName, position: 'insideBottom', offset: -15, fill: '#9CA3AF', fontSize: 12 }} />
                                            <YAxis stroke="#6B7280" fontSize={11} label={{ value: dynamicYName, angle: -90, position: 'insideLeft', offset: -15, fill: '#9CA3AF', fontSize: 12 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                                            <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} dot={{r:4}} activeDot={{r:8}} />
                                        </LineChart>
                                    ) : (
                                        <AreaChart data={safeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                            <defs>
                                              <linearGradient id={`colorValue${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8}/><stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.1}/></linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" stroke="#6B7280" fontSize={11} label={{ value: dynamicXName, position: 'insideBottom', offset: -15, fill: '#9CA3AF', fontSize: 12 }} />
                                            <YAxis stroke="#6B7280" fontSize={11} label={{ value: dynamicYName, angle: -90, position: 'insideLeft', offset: -15, fill: '#9CA3AF', fontSize: 12 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                                            <Area type="stepBefore" dataKey="value" stroke="#0EA5E9" fillOpacity={1} fill={`url(#colorValue${index})`} isAnimationActive={false} />
                                        </AreaChart>
                                    )}
                                </ResponsiveContainer>
                            </ChartErrorBoundary>
                        </div>
                    </div>
                    );
                })}
                </div>
            )}
            
            {dashboardConfig.dashboardInsight && (
                <div style={{ marginTop: '25px', backgroundColor: '#111827', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #F59E0B', borderTop: '1px solid #1F2937', borderRight: '1px solid #1F2937', borderBottom: '1px solid #1F2937' }}>
                    <span style={{ fontSize: '11px', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💡 Autonomous Insight Synthesis
                    </span>
                    {/* ADDED textAlign: 'justify' HERE */}
                    <p style={{ margin: '10px 0 0 0', color: '#E5E7EB', fontSize: '14px', lineHeight: '1.6', textAlign: 'justify' }}>
                        {dashboardConfig.dashboardInsight}
                    </p>
                </div>
            )}

          </div>
        )}

        {strategyConfig && auditConfig && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            
            <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '25px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, color: '#0EA5E9', fontSize: '18px' }}>Cognitive Strategy Architecture</h3>
                  {strategyConfig.cognitive_reasoning && (
                      <span style={{ fontSize: '11px', backgroundColor: '#0B0F19', padding: '6px 12px', borderRadius: '20px', border: '1px solid #374151', color: '#9CA3AF' }}>
                          🧠 Framework: {strategyConfig.cognitive_reasoning.framework_selected}
                      </span>
                  )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#0B0F19', padding: '15px', borderRadius: '8px', border: '1px solid #1F2937' }}>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 'bold' }}>Campaign Identifier</span>
                  <h4 style={{ margin: '5px 0 0 0', color: '#F3F4F6', fontSize: '16px' }}>{strategyConfig.campaignName}</h4>
                </div>
                <div style={{ backgroundColor: '#0B0F19', padding: '15px', borderRadius: '8px', border: '1px solid #1F2937' }}>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 'bold' }}>Core Objective</span>
                  <h4 style={{ margin: '5px 0 0 0', color: '#10B981', fontSize: '16px' }}>{strategyConfig.primaryObjective}</h4>
                </div>
              </div>
              <div style={{ backgroundColor: '#0B0F19', padding: '20px', borderRadius: '8px', border: '1px solid #1F2937', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Psychological Approach</span>
                {/* ADDED textAlign: 'justify' HERE */}
                <p style={{ margin: 0, color: '#E5E7EB', lineHeight: '1.6', fontSize: '14px', textAlign: 'justify' }}>{strategyConfig.strategicApproach}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Execution Sequence</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {strategyConfig.executionSteps?.map((step, index) => (
                    <div key={index} style={{ backgroundColor: '#1F2937', padding: '12px 15px', borderRadius: '6px', color: '#D1D5DB', fontSize: '13px', textAlign: 'justify' }}>
                      <span style={{color: '#0EA5E9', fontWeight: 'bold', marginRight: '8px'}}>{index + 1}.</span>{step}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '25px', borderRadius: '10px' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#10B981', fontSize: '16px' }}>Red Team QA Audit</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', backgroundColor: '#064E3B', border: '1px solid #059669', borderRadius: '8px', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, color: '#34D399', fontSize: '16px' }}>{auditConfig.approvalStatus}</h2>
                    <span style={{ backgroundColor: '#047857', color: '#D1FAE5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Score: {auditConfig.confidenceScore}</span>
                  </div>
                  <ul style={{ paddingLeft: '20px', margin: 0, color: '#FCA5A5', fontSize: '13px', lineHeight: '1.5' }}>
                    {auditConfig.riskFactors?.map((risk, idx) => <li key={idx} style={{marginBottom: '6px', textAlign: 'justify'}}>{risk}</li>)}
                  </ul>
                </div>

                {simulationConfig && (
                    <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '25px', borderRadius: '10px' }}>
                      <h3 style={{ margin: '0 0 15px 0', color: '#F59E0B', fontSize: '16px' }}>Probabilistic Quant Model</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                          <div style={{ backgroundColor: '#0B0F19', padding: '12px', borderRadius: '6px', borderTop: '2px solid #10B981', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: '#9CA3AF', display: 'block' }}>P90 BEST</span>
                              <span style={{ fontSize: '16px', color: '#10B981', fontWeight: 'bold' }}>{simulationConfig.scenarios.P90.roi}</span>
                          </div>
                          <div style={{ backgroundColor: '#0B0F19', padding: '12px', borderRadius: '6px', borderTop: '2px solid #0EA5E9', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: '#9CA3AF', display: 'block' }}>P50 BASE</span>
                              <span style={{ fontSize: '16px', color: '#0EA5E9', fontWeight: 'bold' }}>{simulationConfig.scenarios.P50.roi}</span>
                          </div>
                          <div style={{ backgroundColor: '#0B0F19', padding: '12px', borderRadius: '6px', borderTop: '2px solid #EF4444', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: '#9CA3AF', display: 'block' }}>P10 WORST</span>
                              <span style={{ fontSize: '16px', color: '#EF4444', fontWeight: 'bold' }}>{simulationConfig.scenarios.P10.roi}</span>
                          </div>
                      </div>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* AGENT 7: AUTONOMOUS CAMPAIGN ASSETS */}
        {deploymentConfig && (
          <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '30px', borderRadius: '10px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, color: '#8B5CF6', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🚀 Autonomous Campaign Assets
                </h3>
                {deploymentConfig.copywriting_reasoning && (
                  <span style={{ fontSize: '11px', backgroundColor: '#0B0F19', padding: '6px 12px', borderRadius: '20px', border: '1px solid #374151', color: '#9CA3AF', maxWidth: '400px', textAlign: 'right' }}>
                      🧠 <strong>Channel Strategy:</strong> {deploymentConfig.copywriting_reasoning.channel_strategy}
                  </span>
                )}
            </div>
            
            {/* DYNAMIC ASSET GRID: Adapts to however many channels the AI creates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
              
              {deploymentConfig.assets?.map((asset, index) => (
                  <div key={index} style={{ backgroundColor: '#1F2937', padding: '25px', borderRadius: '8px', borderLeft: `4px solid ${PIE_COLORS[index % PIE_COLORS.length]}`, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>
                        {asset.channel}
                    </span>
                    <div style={{ marginTop: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ backgroundColor: '#374151', padding: '12px 15px', borderRadius: '6px', marginBottom: '15px' }}>
                          <span style={{ fontSize: '14px', color: '#F3F4F6', fontWeight: '600' }}>{asset.assetName}</span>
                      </div>
                      <div style={{ backgroundColor: '#0B0F19', padding: '20px', borderRadius: '6px', border: '1px solid #374151', flexGrow: 1 }}>
                          <p style={{ margin: 0, fontSize: '14px', color: '#D1D5DB', lineHeight: '1.7', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
                              {asset.content}
                          </p>
                      </div>
                    </div>
                  </div>
              ))}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;