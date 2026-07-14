import React, { useState, useRef, useEffect } from 'react';
import { 
  uploadDataForIngestion, 
  triggerDiagnosticAgent, 
  triggerVisualizationAgent, 
  triggerStrategyAgent, 
  triggerAuditorAgent, 
  triggerSimulationAgent, 
  triggerDeploymentAgent 
} from './api';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

// Elite Color Palette for Pie/Donut Charts
const PIE_COLORS = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6'];

// Ironclad Error Boundary to prevent React 19 Recharts crashes
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

function App() {
  // File & Brand Memory State
  const [files, setFiles] = useState([]);
  const [brandName, setBrandName] = useState("");
  const [brandTone, setBrandTone] = useState("");
  
  // Pipeline UI State
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  // AI Configuration States
  const [dashboardConfig, setDashboardConfig] = useState(null);
  const [strategyConfig, setStrategyConfig] = useState(null);
  const [auditConfig, setAuditConfig] = useState(null);
  const [simulationConfig, setSimulationConfig] = useState(null);
  const [deploymentConfig, setDeploymentConfig] = useState(null);

  // Auto-scrolling ref for the Terminal
  const logEndRef = useRef(null);

  // Helper to append logs to the Terminal
  const addLog = (msg, type = "info") => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Input Validation: Force CSVs only
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const isValid = selectedFiles.every(f => f.name.endsWith('.csv'));
    if (!isValid) {
      alert("Validation Error: Please upload only .csv files to ensure data hygiene.");
      e.target.value = null;
    } else {
      setFiles(selectedFiles);
    }
  };

  // Export to Clipboard
  const handleCopyStrategy = () => {
    if (!strategyConfig) return;
    const text = `CAMPAIGN: ${strategyConfig.campaignName}\nOBJECTIVE: ${strategyConfig.primaryObjective}\n\nAPPROACH:\n${strategyConfig.strategicApproach}`;
    navigator.clipboard.writeText(text);
    alert("Strategy copied to clipboard!");
  };

  // Demo Mode: Bypasses API to instantly render the perfect UI state
  const runDemoMode = () => {
    setLogs([]); 
    addLog("DEMO MODE INITIATED: Bypassing external APIs...", "success");
    
    setDashboardConfig({
      kpis: [
        {label: "Customer Acquisition Cost", value: "$120.50", trend: "-5% vs prior"}, 
        {label: "Customer Lifetime Value", value: "$550.00", trend: "+8% vs prior"},
        {label: "Churn Rate", value: "25.1%", trend: "-3% vs prior"},
        {label: "Revenue Recovery Potential", value: "$150,000", trend: "+ vs prior"}
      ],
      charts: [
        {chartType: "PieChart", title: "Customer Segmentation by CLV", data: [{name: "High Value", value: 45}, {name: "At-Risk", value: 30}, {name: "New", value: 25}]},
        {chartType: "LineChart", title: "Monthly Churn Rate Trend", xAxisKey: "Month", dataKey: "Churn", data: [{Month: "Jan", Churn: 28}, {Month: "Feb", Churn: 27}, {Month: "Mar", Churn: 25.1}]}
      ],
      dashboardInsight: "The data indicates that while our highest-value segment is stable, the 'At-Risk' cohort is driving 80% of our overall churn rate. A targeted retention loop for this specific segment will yield the highest immediate ROI."
    });
    
    setStrategyConfig({
      campaignName: "Project Velocity: The Zero-Friction Initiative", 
      primaryObjective: "15% CAC reduction and 12% Churn mitigation through high-value onboarding.",
      targetAudience: "Mid-market B2B users dropping off between Day 3 and Day 7.",
      strategicApproach: "We will deploy a 'Grand Slam' offer that compresses the time-to-value. By increasing the 'Perceived Likelihood of Achievement' through social proof and guaranteed milestones, we neutralize the friction that leads to early-stage churn.",
      executionSteps: [
        "Phase 1: The 'Time-to-Value' Compression: Replace standard sales demos with 'Proof-of-Value' sprints.",
        "Phase 2: The 'Risk-Reversal' Escalation: Introduce a performance-based success guarantee.",
        "Phase 3: The 'LTV-Lock' Mechanism: Implement an automated 'Value-Loop' where account health triggers rewards."
      ],
      cognitive_reasoning: { framework_selected: "Alex Hormozi ($100M Offers)", justification: "High CAC requires an immediate shift in the Value Equation." }
    });
    
    setAuditConfig({ 
      approvalStatus: "APPROVED", 
      confidenceScore: 92, 
      auditNotes: ["Strong psychological logic.", "Tone is highly authoritative."], 
      riskFactors: ["Requires heavy developer resources for Phase 1", "Potential margin compression if guarantee is triggered too often."] 
    });
    
    setSimulationConfig({ 
      scenarios: { 
        P90: {roi: "210%"}, 
        P50: {roi: "85%"}, 
        P10: {roi: "-15%"} 
      } 
    });
    
    setDeploymentConfig({
      copywriting_reasoning: { channel_strategy: "LinkedIn and Direct Email dominate mid-market B2B engagement." },
      assets: [
        {channel: "Cold Email Sequence", assetName: "The '3-Day Win' Hook", content: "Subject: We fixed the 3-day drop-off.\n\nHi [Name],\n\nMost software takes weeks to learn. We designed ours to give you a functional win in 72 hours. If it doesn't, we refund your first month.\n\nLet me show you how."},
        {channel: "LinkedIn Direct Outreach", assetName: "The Authority Builder", content: "I've been analyzing the onboarding friction in your sector. My team just built a sprint model that bypasses the usual 30-day integration. Open to a 5-min breakdown?"}
      ]
    });
    
    setActiveStep(7);
    addLog("Demo data rendered successfully.", "success");
  };

  // The Master Pipeline Execution
  const runPipelineEngine = async () => {
    if (files.length === 0) return alert("Please select a CSV dataset to process.");
    
    setLoading(true); 
    setLogs([]); 
    setActiveStep(1);
    
    // Clear old state
    setDashboardConfig(null); setStrategyConfig(null); setAuditConfig(null); setSimulationConfig(null); setDeploymentConfig(null);
    
    try {
      addLog(`[Agent 1] Data Architect initiating ingest for brand: ${brandName}...`);
      const ingestData = await uploadDataForIngestion(files, brandName, brandTone);
      addLog(`[Agent 1] Complete. Parsed ${files.length} file(s) and mapped relational keys.`, "success");
      
      setActiveStep(2); 
      addLog("[Agent 2] Diagnostic Engine scanning for root cause anomalies...");
      const diagData = await triggerDiagnosticAgent(ingestData.record_id);
      addLog(`[Agent 2] Discovery: ${diagData.diagnosis.substring(0, 75)}...`, "success");
          
      setActiveStep(3); 
      addLog("[Agent 3] Dynamic Visualizer architecting UI schemas...");
      const visData = await triggerVisualizationAgent(ingestData.record_id, diagData.diagnosis);
      setDashboardConfig(visData.chart_config);
      addLog(`[Agent 3] Enterprise dashboard rendered.`, "success");
              
      setActiveStep(4); 
      addLog("[Agent 4] Cognitive CMO routing diagnosis through guru frameworks...");
      const stratData = await triggerStrategyAgent(ingestData.record_id, diagData.diagnosis);
      setStrategyConfig(stratData.strategy);
      addLog(`[Agent 4] Selected Framework: ${stratData.strategy.cognitive_reasoning?.framework_selected}`, "success");
                  
      setActiveStep(5); 
      addLog("[Agent 5] QA Red Team aggressively stress-testing strategy logic...");
      const auditData = await triggerAuditorAgent(ingestData.record_id, stratData.strategy);
      setAuditConfig(auditData.audit);
      addLog(`[Agent 5] Audit complete. Score: ${auditData.audit.confidenceScore}`, "success");
      
      setActiveStep(6); 
      addLog("[Agent 6] Quant Simulator calculating Bayesian ROI boundaries...");
      const simData = await triggerSimulationAgent(ingestData.record_id, stratData.strategy);
      setSimulationConfig(simData.simulation);
      addLog(`[Agent 6] Expected P50 ROI: ${simData.simulation.scenarios.P50?.roi}`, "success");
      
      setActiveStep(7); 
      addLog(`[Agent 7] Elite Creative Director synthesizing assets using tone: ${brandTone}...`);
      const deployData = await triggerDeploymentAgent(ingestData.record_id, stratData.strategy);
      setDeploymentConfig(deployData.assets);
      addLog(`[Agent 7] Assets generated for ${deployData.assets?.assets?.length || 2} unique channels.`, "success");
      
      addLog("Pipeline Execution Complete. All systems nominal.", "success");
    } catch (err) {
      addLog(`CRITICAL FAILURE: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Data Bulldozer for bulletproof Recharts rendering
  let safeKpis = []; let safeCharts = [];
  if (dashboardConfig) {
      safeKpis = dashboardConfig.kpis || dashboardConfig.KPIs || dashboardConfig.Kpis || [];
      safeCharts = Array.isArray(dashboardConfig.charts) ? dashboardConfig.charts : (dashboardConfig.chartType ? [dashboardConfig] : []);
  }

  return (
    <div style={{ backgroundColor: '#090D16', color: '#E5E7EB', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Navbar & Brand Memory (Hidden on Print) */}
      <div className="no-print" style={{ backgroundColor: '#111827', borderBottom: '1px solid #1F2937', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#F3F4F6', letterSpacing: '-0.5px' }}>APEX <span style={{color: '#0EA5E9'}}>// OS</span></h1>
        </div>
        
        {/* UPGRADED BRAND MEMORY UI WITH CLEAR LABELS */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#090D16', padding: '10px 20px', borderRadius: '8px', border: '1px solid #1F2937' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', color: '#0EA5E9', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    🏢 Company Name
                </label>
                <input type="text" value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="e.g., Acme Corp" style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#111827', color: '#fff', fontSize: '13px', width: '200px', outline: 'none' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', color: '#0EA5E9', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    🎙️ Marketing Tone
                </label>
                <input type="text" value={brandTone} onChange={e=>setBrandTone(e.target.value)} placeholder="e.g., Aggressive & Urgent" style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#111827', color: '#fff', fontSize: '13px', width: '200px', outline: 'none' }} />
            </div>
        </div>
      </div>

      <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Execution Bar (Hidden on Print) */}
        <div className="no-print" style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input type="file" multiple accept=".csv" onChange={handleFileChange} style={{ color: '#9CA3AF', padding: '10px', backgroundColor: '#0B0F19', borderRadius: '6px', border: '1px solid #1F2937', fontSize: '13px' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={runDemoMode} disabled={loading} style={{ padding: '10px 20px', backgroundColor: '#374151', color: '#FFF', border: '1px solid #4B5563', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: '0.2s' }}>
                    Try Demo Mode
                </button>
                <button onClick={runPipelineEngine} disabled={loading} style={{ padding: '10px 30px', backgroundColor: loading ? '#EF4444' : '#0EA5E9', color: '#FFF', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px', transition: '0.2s' }}>
                    {loading ? "System Engaged..." : "Execute Pipeline"}
                </button>
            </div>
        </div>

        {/* Multi-Agent Progress & Terminal Logs (Hidden on Print) */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '30px' }}>
            
            {/* Progress Panel */}
            <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '20px', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#9CA3AF', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Swarm Status Sequence</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {['1. Data Architect', '2. Diagnostic Engine', '3. Visualizer', '4. Cognitive CMO', '5. Red Team Auditor', '6. Quant Simulator', '7. Creative Director'].map((step, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: activeStep > idx ? '#10B981' : activeStep === idx + 1 ? '#0EA5E9' : '#4B5563', fontSize: '14px', fontWeight: activeStep === idx + 1 ? 'bold' : 'normal' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: activeStep > idx ? '#10B981' : activeStep === idx + 1 ? '#0EA5E9' : '#374151', boxShadow: activeStep === idx + 1 ? '0 0 8px #0EA5E9' : 'none' }}></div>
                            {step}
                        </div>
                    ))}
                </div>
            </div>

            {/* Terminal Window */}
            <div style={{ backgroundColor: '#000', border: '1px solid #1F2937', padding: '15px 20px', borderRadius: '10px', height: '235px', overflowY: 'auto', fontFamily: '"Fira Code", monospace', fontSize: '13px' }}>
                {logs.length === 0 && <span style={{ color: '#4B5563' }}>Awaiting pipeline execution...</span>}
                {logs.map((log, i) => (
                    <div key={i} style={{ color: log.type === 'error' ? '#EF4444' : log.type === 'success' ? '#10B981' : '#9CA3AF', marginBottom: '6px', lineHeight: '1.4' }}>
                        <span style={{ color: '#4B5563', marginRight: '10px' }}>[{log.time}]</span> 
                        {log.msg}
                    </div>
                ))}
                <div ref={logEndRef} />
            </div>
        </div>

        {/* Export Action Bar (Visible only when complete, Hidden on Print) */}
        {strategyConfig && (
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginBottom: '20px' }}>
                <button onClick={handleCopyStrategy} style={{ padding: '8px 15px', backgroundColor: '#1F2937', color: '#D1D5DB', border: '1px solid #374151', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📋 Copy Strategy to Clipboard</button>
                <button onClick={() => window.print()} style={{ padding: '8px 15px', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📄 Download PDF Report</button>
            </div>
        )}

        {/* --- DYNAMIC DASHBOARD AREA --- */}
        {dashboardConfig && (
          <div style={{ backgroundColor: '#0B0F19', border: '1px solid #1F2937', padding: '25px', borderRadius: '10px' }}>
            <h3 style={{ marginTop: 0, color: '#F3F4F6', fontSize: '20px', borderBottom: '1px solid #1F2937', paddingBottom: '15px', marginBottom: '20px' }}>Executive Analytics: {brandName}</h3>
            
            {/* KPIs */}
            {safeKpis.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {safeKpis.map((kpi, index) => {
                    const trendStr = String(kpi.trend || "");
                    const isNegative = trendStr.includes('-');
                    return (
                      <div key={index} style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #0EA5E9' }}>
                        <p style={{ margin: '0 0 5px 0', color: '#9CA3AF', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>{kpi.label || "Metric"}</p>
                        <h2 style={{ margin: 0, color: '#F3F4F6', fontSize: '26px' }}>{kpi.value || "0"}</h2>
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: isNegative ? '#10B981' : '#EF4444', fontWeight: '500' }}>{trendStr}</p>
                      </div>
                    );
                })}
                </div>
            )}

            {/* Smart Chart Renderer */}
            {safeCharts.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', justifyContent: 'center' }}>
                {safeCharts.map((chart, index) => {
                    
                    // Universal Data Extractor
                    let rawData = [];
                    if (Array.isArray(chart.data)) { rawData = chart.data; } 
                    else { for (const key in chart) { if (Array.isArray(chart[key])) { rawData = chart[key]; break; } } }

                    const requestedType = String(chart.chartType).toLowerCase();
                    const dynamicXName = chart.xAxisKey || "Category";
                    const dynamicYName = chart.dataKey || "Value";

                    const safeData = rawData.map((item, i) => {
                        let xVal = `Item ${i + 1}`; let yVal = 0;
                        if (typeof item !== 'object' || item === null) return { name: String(xVal), value: Number(item) || 0 };
                        const keys = Object.keys(item);
                        let foundString = false; let foundNumber = false;
                        for (const k of keys) {
                            const val = item[k]; const numVal = Number(val);
                            if (typeof val === 'string' && isNaN(numVal) && !foundString) { xVal = val; foundString = true; } 
                            else if (!isNaN(numVal) && !foundNumber) { yVal = numVal; foundNumber = true; }
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
                                                {safeData.map((entry, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} /> )}
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
                                        /* Defaulting Area/Bar requests to Area Step to prevent React 19 minPointSize crash */
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
            
            {/* Executive Insight Block */}
            {dashboardConfig.dashboardInsight && (
                <div style={{ marginTop: '25px', backgroundColor: '#111827', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #F59E0B', borderTop: '1px solid #1F2937', borderRight: '1px solid #1F2937', borderBottom: '1px solid #1F2937' }}>
                    <span style={{ fontSize: '11px', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💡 Autonomous Insight Synthesis
                    </span>
                    <p style={{ margin: '10px 0 0 0', color: '#E5E7EB', fontSize: '14px', lineHeight: '1.6', textAlign: 'justify' }}>
                        {dashboardConfig.dashboardInsight}
                    </p>
                </div>
            )}
          </div>
        )}

        {/* Strategy & Audit Blocks */}
        {strategyConfig && auditConfig && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '20px' }}>
            
            {/* Cognitive Strategy */}
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

            {/* QA Audit & Simulation */}
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
                              <span style={{ fontSize: '16px', color: '#10B981', fontWeight: 'bold' }}>{simulationConfig.scenarios.P90?.roi || simulationConfig.scenarios.P90?.ROI}</span>
                          </div>
                          <div style={{ backgroundColor: '#0B0F19', padding: '12px', borderRadius: '6px', borderTop: '2px solid #0EA5E9', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: '#9CA3AF', display: 'block' }}>P50 BASE</span>
                              <span style={{ fontSize: '16px', color: '#0EA5E9', fontWeight: 'bold' }}>{simulationConfig.scenarios.P50?.roi || simulationConfig.scenarios.P50?.ROI}</span>
                          </div>
                          <div style={{ backgroundColor: '#0B0F19', padding: '12px', borderRadius: '6px', borderTop: '2px solid #EF4444', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: '#9CA3AF', display: 'block' }}>P10 WORST</span>
                              <span style={{ fontSize: '16px', color: '#EF4444', fontWeight: 'bold' }}>{simulationConfig.scenarios.P10?.roi || simulationConfig.scenarios.P10?.ROI}</span>
                          </div>
                      </div>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* AGENT 7: AUTONOMOUS CAMPAIGN ASSETS */}
        {deploymentConfig && (
          <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '30px', borderRadius: '10px', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, color: '#8B5CF6', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🚀 Autonomous Campaign Assets
                </h3>
                {deploymentConfig.copywriting_reasoning && (
                  <span style={{ fontSize: '11px', backgroundColor: '#0B0F19', padding: '6px 12px', borderRadius: '20px', border: '1px solid #374151', color: '#9CA3AF', maxWidth: '400px', textAlign: 'right', lineHeight: '1.4' }}>
                      🧠 <strong>Channel Strategy:</strong> {deploymentConfig.copywriting_reasoning.channel_strategy}
                  </span>
                )}
            </div>
            
            {/* DYNAMIC ASSET GRID */}
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

      {/* Global Print CSS to optimize the "Download PDF" view */}
      <style>{`
        @media print {
            body { background-color: #fff !important; color: #000 !important; }
            .no-print { display: none !important; }
            * { border-color: #ccc !important; }
            h1, h2, h3, h4, p, span, div { color: #000 !important; }
            .recharts-text { fill: #000 !important; }
        }
      `}</style>
    </div>
  );
}

export default App;