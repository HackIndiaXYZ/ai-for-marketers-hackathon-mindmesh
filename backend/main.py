# backend/main.py
import os
import io
import logging
import pandas as pd
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

import re
import time
import json

# Import Database Dependencies
from database import engine, get_db, CampaignData

# Import Official SDKs
from google import genai
from groq import Groq

from typing import List, Dict, Any
from pydantic import BaseModel

# Load environment configuration
load_dotenv()

# Setup logging to catch all hidden system anomalies
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("apex_logger")

app = FastAPI(title="Apex Marketing OS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # CHANGED: Allows Vercel to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Safe Client Initializations
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")

gemini_client = genai.Client(api_key=GEMINI_KEY) if GEMINI_KEY else None
groq_client = Groq(api_key=GROQ_KEY) if GROQ_KEY else None

class VisualizeRequest(BaseModel):
    diagnosis: str

class StrategyRequest(BaseModel):
    diagnosis: str

class AuditRequest(BaseModel):
    strategy: str

class SimulationRequest(BaseModel):
    strategy: str    

class DeployRequest(BaseModel):
    strategy: str    

def run_ingestion_agent(file_names: str, multi_file_context: str, brand_name: str, user_prompt: str) -> str:
    """Agent 1: Lead Quantitative Data Scientist (Predictive Feature Engineer)"""
    if not gemini_client:
        return f"Ingested {file_names} successfully (Gemini API Key missing, running in local fallback mode)."
    
    prompt = f"""
    You are Agent 1, the Lead Quantitative Data Scientist and Predictive Feature Engineer for {brand_name}.
    You are reviewing a batch of raw marketing datasets. Your objective is to engineer predictive features, identify statistical anomalies, and prepare a strict quantitative architecture for the diagnostic team.
    
    Files Uploaded: {file_names}
    User's Defined Problem/Context: {user_prompt if user_prompt else "None provided. You must infer the business context entirely from the raw data."}
    
    Data Schema & Samples:
    {multi_file_context}
    
    CRITICAL INSTRUCTIONS:
    You must perform a rigorous Forensic Data Profile. Use the User's Defined Problem (if provided) as your primary lens for investigation.
    Output STRICTLY valid JSON. Do not use markdown formatting blocks (no ```json).
    
    Follow this exact JSON schema:
    {{
        "statistical_variance_monologue": "Your internal Chain-of-Thought detailing which columns hold the highest predictive weight for revenue leakage and why.",
        "business_theme": "The exact quantitative business context (e.g., B2B SaaS Retention, High-Volume E-commerce Acquisition).",
        "relational_map": "Identification of probable primary/foreign keys and how the datasets interconnect structurally.",
        "data_hygiene_and_anomalies": "Specific assessment of missing values, formatting errors, or statistical outliers visible in the sample.",
        "critical_blind_spots": "Identify exactly what necessary data is missing from the environment.",
        "signal_extraction": "The single most critical financial story or risk vector hidden in this structural architecture."
    }}
    """
    
    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"temperature": 0.1} 
        )
        
        raw_text = response.text
        import re
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if not match: return raw_text
        return match.group(0)
        
    except Exception as e:
        logger.error(f"Gemini API Execution Error: {str(e)}")
        return f"Parsed data structure successfully, but Gemini API returned an error: {str(e)}"
        
def run_diagnostic_agent_fallback(data_summary: str) -> str:
    """Original non-endpoint fallback function preserved to maintain exact file structure"""
    if not groq_client:
        return "Groq Client offline. Fallback: Data implies a 15% drop in retention."

    prompt = f"""
    You are Agent 2 (The Diagnostic Analyst) in a marketing system.
    Analyze this ingested data summary: {data_summary}
    Identify the single biggest marketing bottleneck or revenue leak based on this context.
    Keep it under 3 sentences. Be highly specific and data-driven.
    """
    try:
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.2
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Groq diagnostic failed: {str(e)}"        

@app.get("/")
def read_root():
    return {
        "message": "Apex Backend is Live.",
        "gemini_connected": gemini_client is not None,
        "groq_connected": groq_client is not None
    }

@app.post("/api/ingest/")
async def ingest_data(
    files: List[UploadFile] = File(...), 
    brand_name: str = Form("Generic Brand"),
    brand_tone: str = Form("Professional"),
    user_prompt: str = Form(None), # <--- NEW PARAMETER
    db: Session = Depends(get_db)
):
    try:
        combined_context = []
        total_rows = 0
        all_columns = set()
        filenames = []

        for file in files:
            filenames.append(file.filename)
            contents = await file.read()
            try:
                df = pd.read_csv(io.BytesIO(contents))
                rows = len(df)
                cols = df.columns.tolist()
                total_rows += rows
                all_columns.update(cols)
                sample_data_str = df.head(3).to_string()
                combined_context.append(
                    f"--- FILE: {file.filename} ---\nTotal Rows: {rows}\nColumns: {cols}\nData Sample:\n{sample_data_str}\n\n"
                )
            except Exception as csv_err:
                raise HTTPException(status_code=400, detail=f"Invalid CSV layout in {file.filename}: {str(csv_err)}")
        
        combined_context_str = "\n".join(combined_context)
        file_names_str = ", ".join(filenames)
        
        # Pass the user_prompt into Agent 1
        ai_analysis_summary = run_ingestion_agent(file_names_str, combined_context_str, brand_name, user_prompt)
        
        new_data = CampaignData(
            filename=file_names_str, 
            status="Diagnostic Queue",
            insights=ai_analysis_summary,
            brand_name=brand_name,
            brand_tone=brand_tone,
            user_prompt=user_prompt # <--- SAVE TO DATABASE
        )
        db.add(new_data)
        db.commit()
        db.refresh(new_data)
        
        return {
            "status": "success",
            "agent": "Agent 1: Ingestion & Routing",
            "metadata": {"rows": total_rows, "columns": list(all_columns)},
            "insights": ai_analysis_summary,
            "record_id": new_data.id
        }
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as general_ex:
        logger.error(f"Critical System Crash caught: {str(general_ex)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Pipeline Error: {str(general_ex)}")

@app.post("/api/diagnose/{record_id}")
async def run_diagnostic_agent(record_id: int, db: Session = Depends(get_db)):
    """Agent 2: Forensic Growth Analyst (Multi-Variable Correlation)"""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")

    if not groq_client:
        return {"status": "error", "message": "Groq API Key missing. Cannot run Agent 2."}

    prompt = f"""
    You are Agent 2, an elite Forensic Growth Analyst and Senior Data Scientist for the brand {record.brand_name}.
    Agent 1 (The Lead Quantitative Data Scientist) has provided the following structured statistical dossier:
    {record.insights}
    
    User's Stated Problem: {record.user_prompt if record.user_prompt else "None provided."}
    
    Your task is to perform a rigorous multi-variable correlation to diagnose the single most critical, high-leverage revenue leak. 
    If the User provided a 'Stated Problem', you must mathematically validate if their assumption is correct based on Agent 1's data, or if they are looking at the wrong bottleneck.
    
    CRITICAL INSTRUCTION: You must completely ignore vanity metrics (likes, impressions) and focus strictly on margin-degrading bottlenecks.
    
    You must utilize a "Falsification Test" methodology. Before finalizing your diagnosis, you must formulate a hypothesis and actively attempt to mathematically disprove it using the data anomalies and blind spots provided by Agent 1.
    
    Output STRICTLY valid JSON. Do not use markdown formatting blocks (no ```json).
    
    Follow this exact schema:
    {{
        "falsification_test": "Your internal monologue. Validate or invalidate the User's Stated Problem (if provided). Formulate a primary hypothesis for the bottleneck, cross-reference variables, and actively try to disprove your own hypothesis.",
        "executive_diagnosis": "A highly authoritative, dense 3-to-4 sentence diagnosis. 1. State the High-Leverage Symptom. 2. State the Root Cause via multi-variable correlation. 3. DIRECTIVE FOR AGENT 3: End by explicitly commanding the Visualization Agent on the exact 3 metrics it MUST graph to prove this to the board."
    }}
    """
    
    try:
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.1, 
            response_format={"type": "json_object"}
        )
        
        raw_text = response.choices[0].message.content
        diagnostic_data = json.loads(raw_text)
        diagnostic_insight = diagnostic_data.get("executive_diagnosis", raw_text)
        
        record.status = "Visualization Queue"
        db.commit()
        
        return {
            "status": "success",
            "agent": "Agent 2: Forensic Growth Analyst",
            "diagnosis": diagnostic_insight,
            "falsification_log": diagnostic_data.get("falsification_test", "")
        }
        
    except Exception as e:
        logger.error(f"Groq Execution Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agent 2 failed: {str(e)}")

@app.post("/api/visualize/{record_id}")
async def run_visualization_agent(record_id: int, req: VisualizeRequest, db: Session = Depends(get_db)):
    """Agent 3: Executive Data Storyteller (Cognitive Load Reduction)"""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")

    if not groq_client:
        return {"status": "error", "message": "Groq API Key missing."}

    prompt = f"""
    You are Agent 3, an elite Executive Data Storyteller and Principal Visualization Architect for {record.brand_name}.
    Agent 2 (The Forensic Growth Analyst) has dictated the following high-leverage business bottleneck: 
    "{req.diagnosis}"
    
    Your task is to design a dynamic, highly contextual dashboard that proves this diagnosis to the Board of Directors instantly.
    
    CRITICAL INSTRUCTIONS:
    1. PREVENT COGNITIVE OVERLOAD: Do not output random charts. You must select chart architectures that directly answer the core financial question.
    2. PREVENT VISUAL DISTORTION: When generating the 'data' arrays, you must dynamically scale the axes logically and group extreme outliers into a single category (e.g., "Other") so the graph does not look mathematically distorted.
    3. You MUST choose the best chartType from this strict list: "BarChart" (for comparisons), "LineChart" (for trends over time), "AreaChart" (for volume), or "PieChart" (for segmentation/distribution).
    
    Output STRICTLY valid JSON. Do not use markdown formatting blocks (no ```json).
    
    Schema to follow:
    {{
        "cognitive_load_assessment": "Your internal monologue justifying WHY this specific chart architecture is the fastest way for a human brain to process the anomaly found by Agent 2, and explaining how you have structured the data to prevent visual distortion.",
        "kpis": [
            {{"label": "Specific Metric", "value": "Number", "trend": "+/- %"}}
        ],
        "charts": [
            {{
                "chartType": "PieChart", 
                "title": "Segment Distribution",
                "xAxisKey": "name",
                "dataKey": "value",
                "data": [ {{"name": "Segment A", "value": 25}}, {{"name": "Segment B", "value": 40}} ]
            }}
        ],
        "dashboardInsight": "A dense 2-3 sentence executive summary explaining the correlation between these charts and the financial reality of the business."
    }}
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Temperature kept at 0.3 to allow the AI to logically generate sample data points while strictly adhering to JSON format
            response = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
                max_tokens=1000,
                response_format={"type": "json_object"}
            )
            
            raw_text = response.choices[0].message.content
            dashboard_config = json.loads(raw_text)
            
            # Record saving for Pipeline History
            record.dashboard_config = json.dumps(dashboard_config)
            record.status = "Strategy Queue"
            db.commit()
            
            return {
                "status": "success",
                "agent": "Agent 3: Executive Data Storyteller",
                "chart_config": dashboard_config
            }
            
        except Exception as e:
            error_str = str(e)
            if attempt < max_retries - 1:
                logger.warning(f"Groq API Error. Retrying... (Attempt {attempt + 1}/{max_retries})")
                import time
                time.sleep(2)
                continue
            logger.error(f"Agent 3 Execution Error: {error_str}")
            raise HTTPException(status_code=500, detail=f"Agent 3 crashed: {error_str}")

@app.post("/api/strategy/{record_id}")
async def run_strategy_agent(record_id: int, req: StrategyRequest, db: Session = Depends(get_db)):
    """Agent 4: Chief Revenue & Behavioral Officer (Macro-Environment & Friction Analysis)"""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")

    if not gemini_client:
        return {"status": "error", "message": "Gemini API Key missing."}

    prompt = f"""
    You are Agent 4, an elite Chief Revenue & Behavioral Officer for the brand {record.brand_name}.
    You are operating in the brutal reality of the 2026 market environment: AI-saturated feeds, zero-click platform architectures, and hyper-skeptical consumers who are entirely blind to traditional marketing.
    
    Agent 2 (Forensic Growth Analyst) has diagnosed the following critical business bottleneck: 
    "{req.diagnosis}"
    
    Your directive is to architect a multi-million-dollar marketing campaign to solve this exact bottleneck.
    
    CRITICAL INSTRUCTIONS:
    1. MACRO-SCAN: You must first evaluate how current market fatigue impacts this specific bottleneck.
    2. FRICTION ANALYSIS: Anticipate failure. List the top 3 reasons a consumer will logically reject or ignore this campaign.
    3. FRAMEWORK ROUTING: You must route this problem through ONE of the following elite frameworks to dismantle those exact consumer defenses:
        - EUGENE SCHWARTZ (Breakthrough Advertising)
        - ALEX HORMOZI ($100M Offers)
        - NIR EYAL (Hooked Model)
        - ROBERT CIALDINI (Influence)
    
    Output STRICTLY raw JSON. Do NOT use markdown formatting blocks (no ```json). 
    Follow this exact schema:
    {{
        "macro_environment_scan": "Analyze how current market fatigue, AI-saturation, and zero-click architectures specifically impact this target audience.",
        "friction_point_analysis": [
            {{"rejection_reason": "Specific logical defense 1", "dismantling_strategy": "How we bypass this..."}},
            {{"rejection_reason": "Specific logical defense 2", "dismantling_strategy": "How we bypass this..."}},
            {{"rejection_reason": "Specific logical defense 3", "dismantling_strategy": "How we bypass this..."}}
        ],
        "cognitive_reasoning": {{
            "framework_selected": "Name of the Guru Framework",
            "justification": "Why this framework perfectly dismantles the friction points above (max 2 sentences)",
            "psychological_angle": "The core human emotion or bias we are targeting"
        }},
        "campaignName": "A catchy, aggressive, professional campaign name",
        "primaryObjective": "The explicit financial goal (e.g., LTV Expansion, Churn Mitigation)",
        "targetAudience": "Highly specific psychological and demographic segment",
        "strategicApproach": "2-3 sentences explaining exactly how the chosen framework will be deployed to manipulate market behavior in our favor.",
        "executionSteps": [
            "Phase 1: The Initial Hook & Psychological Trigger...",
            "Phase 2: The Value Delivery & Escalation...",
            "Phase 3: The Conversion/Retention Mechanism..."
        ]
    }}
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # UPGRADED TO THE ELITE PRO MODEL & FORCED NATIVE JSON MODE
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={
                    "temperature": 0.7,
                    "response_mime_type": "application/json" # <--- The Silver Bullet
                } 
            )
            
            raw_text = response.text
            
            # Since we forced application/json, we can load it directly. Regex kept as a fallback.
            try:
                strategy_config = json.loads(raw_text)
            except json.JSONDecodeError:
                import re
                match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if not match:
                    raise ValueError("Agent 4 failed to format cognitive output.")
                strategy_config = json.loads(match.group(0))
            
            record.strategy_config = json.dumps(strategy_config)
            record.status = "Validation Queue"
            db.commit()
            
            return {
                "status": "success",
                "agent": "Agent 4: Chief Revenue & Behavioral Officer",
                "strategy": strategy_config
            }
            
        except Exception as e:
            error_str = str(e)
            if "503" in error_str or "UNAVAILABLE" in error_str:
                if attempt < max_retries - 1:
                    logger.warning(f"Gemini Servers busy (503). Retrying... (Attempt {attempt + 1}/{max_retries})")
                    import time
                    time.sleep(3)
                    continue
            logger.error(f"Agent 4 Cognitive Error: {error_str}")
            raise HTTPException(status_code=500, detail=f"Agent 4 crashed: {error_str}")

async def run_strategy_agent_duplicate(record_id: int, req: StrategyRequest, db: Session = Depends(get_db)):
    """Original non-endpoint fallback function preserved to maintain exact file structure"""
    pass # Preserved logic was moved to the actual active endpoint above

@app.post("/api/audit/{record_id}")
async def run_auditor_agent(record_id: int, req: AuditRequest, db: Session = Depends(get_db)):
    """Agent 5: Private Equity Risk Partner (Capital & Margin Defense)"""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
         raise HTTPException(status_code=404, detail="Database record not found.")
    
    prompt = f"""
    You are Agent 5, an aggressive Private Equity Risk Partner and Board Member for {record.brand_name}.
    Your job is to ruthlessly stress-test and audit this AI-generated marketing strategy proposed by your CMO:
    
    {req.strategy}
    
    CRITICAL INSTRUCTIONS:
    1. CAPITAL PRESERVATION: You do not care about vanity metrics. You only care about unit economics, margin defense, and profitability. 
    2. DISCOUNTING PENALTY: If the strategy relies on heavy discounting, lazy price slashing, or unsustainable burn rates to acquire users, you MUST flag it as a margin-degrading risk and demand a structural pivot. We want psychological value creation, not a race to the bottom.
    3. CAC PAYBACK: Systematically evaluate the implied Customer Acquisition Cost (CAC) payback period. If the timeline to recoup capital is too long, reject the strategy.
    4. BRAND SAFETY: If the strategy sounds like a cheap, hyper-aggressive internet scam, kill it.
    
    Output STRICTLY raw JSON. Do NOT use markdown formatting blocks (no ```json). 
    Follow this exact schema:
    {{
        "risk_of_ruin_calculation": "Your internal monologue. Systematically evaluate the implied CAC payback period, cash burn sustainability, and check if the strategy relies on margin-destroying discounts.",
        "approvalStatus": "APPROVED, APPROVED WITH CONDITIONS, or REJECTED",
        "confidenceScore": 85,
        "auditNotes": [
            "Brutally honest note on margin viability...",
            "Critique of the psychological originality or tone..."
        ],
        "riskFactors": [
            "Specific financial risk (e.g., margin compression due to discounting)...",
            "Specific brand risk (e.g., audience fatigue)..."
        ],
        "pivot_demands": [
            "If rejected or conditional, what must structurally change to protect the firm's capital."
        ]
    }}
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Maintained at 0.1 for strict, ruthless, hyper-logical financial evaluation
            response = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            raw_text = response.choices[0].message.content
            audit_config = json.loads(raw_text)
            
            # Record saving for Pipeline History
            record.audit_config = json.dumps(audit_config)
            record.status = "Simulation Queue"
            db.commit()
            
            return {
                "status": "success", 
                "audit": audit_config
            }
            
        except Exception as e:
            error_str = str(e)
            if attempt < max_retries - 1:
                logger.warning(f"Groq API Error during Audit. Retrying... (Attempt {attempt + 1}/{max_retries})")
                import time
                time.sleep(2)
                continue
                
            logger.error(f"Agent 5 Execution Error: {error_str}")
            raise HTTPException(status_code=500, detail=f"Agent 5 crashed: {error_str}")        

@app.post("/api/simulate/{record_id}")
async def run_simulation_agent(record_id: int, req: SimulationRequest, db: Session = Depends(get_db)):
    """Agent 6: Bayesian Financial Modeler (Variable Sensitivity Analysis)"""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")
    
    prompt = f"""
    You are Agent 6, an elite Bayesian Financial Modeler and Quantitative Market Analyst for {record.brand_name}.
    Review this finalized marketing strategy: 
    {req.strategy}
    
    Perform a Probabilistic Market Simulation (Bayesian Scenario Modeling) to dictate capital allocation.
    
    CRITICAL INSTRUCTIONS:
    1. STRICT QUANTITATIVE LOGIC: Do not output arbitrary ROI percentages. Base your P90 (Best Case), P50 (Expected/Baseline), and P10 (Worst Case) scenarios on realistic statistical confidence intervals and historical B2B/B2C baseline assumptions.
    2. SENSITIVITY ANALYSIS: You must identify the single metric (e.g., Click-Through Rate, Sales Conversion, Onboarding Drop-off) that has the highest mathematical impact on shifting the outcome from the P50 baseline down to the P10 worst-case scenario.
    3. STERILE OUTPUT: The output must be highly sterile, probabilistic data points suitable for immediate financial allocation decisions by a CFO or Private Equity board.
    
    Output STRICTLY valid JSON. Do NOT use unescaped double quotes inside your text values. Do NOT use markdown formatting blocks (no ```json).
    
    Schema to follow:
    {{
        "variable_sensitivity_analysis": "Your internal quantitative monologue. Identify the most sensitive mathematical lever in this strategy and explain exactly how a variance in this metric cascades into a P10 failure.",
        "scenarios": {{
            "P90": {{ "ctr": "4.8%", "conversion": "3.5%", "roi": "210%" }},
            "P50": {{ "ctr": "2.1%", "conversion": "1.2%", "roi": "45%" }},
            "P10": {{ "ctr": "0.6%", "conversion": "0.3%", "roi": "-35%" }}
        }},
        "simulationNotes": "A sterile, 2-sentence quantitative summary of the capital allocation risk."
    }}
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Temperature locked at 0.1 for strict mathematical compliance and minimal hallucination
            response = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.1, 
                response_format={"type": "json_object"} 
            )
            
            raw_text = response.choices[0].message.content
            sim_config = json.loads(raw_text)
            
            # Record saving for Pipeline History
            record.sim_config = json.dumps(sim_config)
            record.status = "Deployment Queue"
            db.commit()
            
            return {
                "status": "success", 
                "simulation": sim_config
            }
            
        except Exception as e:
            error_str = str(e)
            if attempt < max_retries - 1:
                logger.warning(f"Groq API Error during Simulation. Retrying... (Attempt {attempt + 1}/{max_retries})")
                import time
                time.sleep(2)
                continue
                
            logger.error(f"Agent 6 Execution Error: {error_str}")
            raise HTTPException(status_code=500, detail=f"Agent 6 crashed: {error_str}")

@app.post("/api/deploy/{record_id}")
async def run_deployment_agent(record_id: int, req: DeployRequest, db: Session = Depends(get_db)):
    """Agent 7: Media Psychology Director (Native Platform & Saturation Logic)"""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")
    
    prompt = f"""
    You are Agent 7, an elite Media Psychology Director and Direct-Response Copywriter for the brand {record.brand_name}.
    Your brand tone and voice guidelines strictly dictate a '{record.brand_tone}' approach.
    You have been handed this finalized marketing strategy: 
    {req.strategy}
    
    CRITICAL INSTRUCTIONS:
    1. NATIVE PSYCHOLOGY: Do not use generic copywriting formulas. Focus on pattern interrupts, rapid time-to-value compression, and zero-friction conversion architectures.
    2. CHANNEL SELECTION: Autonomously decide the 3 to 4 best marketing channels.
    3. BRAND SAFETY: Strictly enforce brand safety. Ensure all generated copy is highly persuasive without resorting to cheap internet marketing tactics or manipulative formatting.
    4. STRICT TEXT REQUIREMENT: You must absolutely exclude all emojis from your reasoning and the generated assets. The output must remain entirely text-based, sterile, and professional.
    
    Output STRICTLY raw JSON. Do NOT use markdown formatting blocks (no ```json).
    Follow this exact schema:
    {{
        "channel_saturation_logic": "Your internal monologue justifying why the selected mediums have the highest probability of bypassing consumer ad-blindness.",
        "copywriting_reasoning": {{
            "psychological_hook": "Explain the core human emotion/bias this copy triggers.",
            "conversion_architecture": "Explain how the copy compresses time-to-value and removes friction."
        }},
        "assets": [
            {{
                "channel": "e.g., TikTok Video Script",
                "assetName": "e.g., The 'Contrarian Hook' Reel",
                "content": "The full script, direct-response copy, or outline. Use short paragraphs. Agitate pain, present solution, strong CTA. (NO EMOJIS ALLOWED)."
            }},
            {{
                "channel": "e.g., B2B Cold LinkedIn",
                "assetName": "e.g., The 'Value-First' Connection Message",
                "content": "The actual text..."
            }}
        ]
    }}
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Temperature at 0.6 allows for high-level creative synthesis while respecting strict formatting rules
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"temperature": 0.6} 
            )
            
            raw_text = response.text
            import re
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if not match:
                raise ValueError("Agent 7 failed to format dynamic copy output.")
                
            clean_json = match.group(0)
            deploy_config = json.loads(clean_json)
            
            # Record saving for Pipeline History
            record.deploy_config = json.dumps(deploy_config)
            record.status = "Deployed"
            db.commit()
            
            return {
                "status": "success", 
                "assets": deploy_config
            }
            
        except Exception as e:
            error_str = str(e)
            if "503" in error_str or "UNAVAILABLE" in error_str:
                if attempt < max_retries - 1:
                    logger.warning(f"Gemini Servers busy (503). Retrying... (Attempt {attempt + 1}/{max_retries})")
                    import time
                    time.sleep(3)
                    continue
            logger.error(f"Agent 7 Execution Error: {error_str}")
            raise HTTPException(status_code=500, detail=f"Agent 7 crashed: {error_str}")