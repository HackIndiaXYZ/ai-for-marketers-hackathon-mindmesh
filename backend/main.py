# backend/main.py
import os
import io
import logging
import pandas as pd
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from dotenv import load_dotenv

import re
import time

# Import Database Dependencies
from database import engine, get_db, CampaignData

# Import Official SDKs
from google import genai
from groq import Groq

from typing import List, Dict, Any

from pydantic import BaseModel
import json

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

def run_ingestion_agent(file_names: str, multi_file_context: str) -> str:
    """
    Agent 1: Enterprise Data Profiler & Relational Architect
    Powered by Gemini to interlink datasets and run hygiene checks.
    """
    if not gemini_client:
        return f"Ingested {file_names} successfully (Gemini API Key missing, running in local fallback mode)."
    
    prompt = f"""
    You are Agent 1, the Principal Data Architect for an autonomous Marketing OS.
    The user has uploaded a batch of raw marketing datasets. 
    
    Files Uploaded: {file_names}
    
    Data Schema & Samples:
    {multi_file_context}
    
    CRITICAL INSTRUCTION: Perform a deep Forensic Data Profile. Do not just give a generic summary.
    Output a highly professional, structured brief containing:
    
    1. BUSINESS THEME: What is the exact business context of this data? (e.g., SaaS Retention, E-commerce Acquisition, B2B Lead Gen).
    2. RELATIONAL MAP: How do these files logically link together? Identify the probable primary/foreign keys across the tables.
    3. DATA HYGIENE: Are there missing values, formatting errors, or messy columns visible in the sample?
    4. SIGNAL EXTRACTION: Based on the column headers, what is the most critical financial story this data is hiding?
    
    Format this as a dense, authoritative text brief. This brief will be fed directly into the neural network of Agent 2.
    """
    
    try:
        response = gemini_client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config={"temperature": 0.2} # Low temperature for strict, factual data analysis
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini API Execution Error: {str(e)}")
        return f"Parsed data structure successfully, but Gemini API returned an error: {str(e)}"

def run_diagnostic_agent(data_summary: str) -> str:
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
async def ingest_data(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    try:
        combined_context = []
        total_rows = 0
        all_columns = set()
        filenames = []

        # Loop through all uploaded files
        for file in files:
            filenames.append(file.filename)
            contents = await file.read()
            
            try:
                df = pd.read_csv(io.BytesIO(contents))
                rows = len(df)
                cols = df.columns.tolist()
                
                total_rows += rows
                all_columns.update(cols)
                
                # Take a clean sample of the first 3 rows from EACH file
                sample_data_str = df.head(3).to_string()
                
                # Append to the massive context string for Gemini
                combined_context.append(
                    f"--- FILE: {file.filename} ---\n"
                    f"Total Rows: {rows}\n"
                    f"Columns: {cols}\n"
                    f"Data Sample:\n{sample_data_str}\n\n"
                )
            except Exception as csv_err:
                raise HTTPException(status_code=400, detail=f"Invalid CSV layout in {file.filename}: {str(csv_err)}")
        
        combined_context_str = "\n".join(combined_context)
        file_names_str = ", ".join(filenames)
        
        # Execute Gemini 2.5 Flash on the combined context
        ai_analysis_summary = run_ingestion_agent(file_names_str, combined_context_str)
        
        # Write unified state cleanly into SQLite Database
        new_data = CampaignData(
            filename=file_names_str, 
            status="Diagnostic Queue",
            insights=ai_analysis_summary
        )
        db.add(new_data)
        db.commit()
        db.refresh(new_data)
        
        return {
            "status": "success",
            "agent": "Agent 1: Ingestion & Routing",
            "metadata": {
                "rows": total_rows,
                "columns": list(all_columns)
            },
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
    """
    Agent 2: Forensic Revenue Analyst (Root Cause Analysis)
    Strictly powered by Groq for high-speed anomaly detection.
    """
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")

    if not groq_client:
        return {"status": "error", "message": "Groq API Key missing. Cannot run Agent 2."}

    prompt = f"""
    You are Agent 2, an elite Forensic Revenue Analyst and Data Scientist for a Fortune 500 company.
    Agent 1 has profiled the raw database and provided this architectural context:
    {record.insights}
    
    Your task is to diagnose the single most critical marketing bottleneck or revenue leak.
    
    CRITICAL INSTRUCTION: Do not just guess. You must perform a logical "Root Cause Analysis" based ONLY on the data context provided.
    
    Write a highly authoritative, dense 3-to-4 sentence diagnosis that includes:
    1. The Primary Symptom (e.g., Bleeding LTV, Spiking CAC, Funnel Drop-off).
    2. The Deducted Root Cause based on the available data parameters.
    3. DIRECTIVE FOR AGENT 3: End your diagnosis by explicitly commanding the Visualization Agent on the exact 3 metrics it MUST graph to prove this diagnosis to the board.
    
    Do not use JSON. Output this as a professional, ruthless executive summary paragraph.
    """
    
    try:
        # Execute Groq Engine instantly
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.3, # Slight variance to deduce the root cause creatively
            max_tokens=250
        )
        
        diagnostic_insight = response.choices[0].message.content
        
        # Update the Database State
        record.status = "Visualization Queue"
        db.commit()
        
        return {
            "status": "success",
            "agent": "Agent 2: Diagnostic Bottleneck Discovery",
            "diagnosis": diagnostic_insight
        }
        
    except Exception as e:
        logger.error(f"Groq Execution Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agent 2 failed: {str(e)}")        

@app.post("/api/visualize/{record_id}")
async def run_visualization_agent(record_id: int, req: VisualizeRequest, db: Session = Depends(get_db)):
    """Agent 3: Dynamic Data Visualization Architect (With Insights & New Charts)."""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")

    if not groq_client:
        return {"status": "error", "message": "Groq API Key missing."}

    prompt = f"""
    You are Agent 3, an elite Principal Data Visualization Architect.
    Agent 2 identified this specific business bottleneck: "{req.diagnosis}"
    
    Your task is to design a dynamic, highly contextual dashboard to visualize this exact problem.
    
    CRITICAL RULES:
    1. Output strictly valid JSON.
    2. Choose 2 to 4 highly relevant KPIs.
    3. Choose 1 to 3 highly relevant Charts.
    4. You MUST choose the best chartType: "BarChart" (comparisons), "LineChart" (trends), "AreaChart" (volume), or "PieChart" (segmentation/distribution).
    5. Write a 2-3 sentence 'dashboardInsight' explaining the correlation between these charts and what they reveal about the business.
    
    Schema to follow:
    {{
        "kpis": [
            {{"label": "Specific Metric", "value": "Number", "trend": "+/- %"}}
        ],
        "charts": [
            {{
                "chartType": "PieChart", 
                "title": "Segment Distribution",
                "xAxisKey": "category",
                "dataKey": "value",
                "data": [ {{"category": "Segment A", "value": 25}}, {{"category": "Segment B", "value": 40}} ]
            }}
        ],
        "dashboardInsight": "The data indicates that while overall volume is stable, Segment B is driving 60% of the Customer Acquisition Cost, suggesting a severe mismatch in targeting."
    }}
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
                max_tokens=800,
                response_format={"type": "json_object"}
            )
            
            raw_text = response.choices[0].message.content
            dashboard_config = json.loads(raw_text)
            
            record.status = "Strategy Queue"
            db.commit()
            
            return {
                "status": "success",
                "agent": "Agent 3: Dynamic Visualization",
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
    """Agent 4: Cognitive CMO using Adaptive Framework Routing."""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")

    if not gemini_client:
        return {"status": "error", "message": "Gemini API Key missing."}

    # UPGRADED PROMPT: Removing the rigid rules and forcing creative evaluation
    prompt = f"""
    You are Agent 4, an elite Chief Marketing Officer and Behavioral Psychologist for a Fortune 500 company.
    Agent 2 has diagnosed the following critical business bottleneck: "{req.diagnosis}"
    
    Your directive is to architect a multi-million-dollar marketing campaign to solve this exact bottleneck.
    
    CRITICAL INSTRUCTION: You must creatively select ONE of the following elite frameworks. Evaluate the diagnosis deeply and choose the framework that provides the most unique psychological leverage. DO NOT default to the same framework every time; vary your approach based on the nuances of the data.
    
    1. EUGENE SCHWARTZ (Breakthrough Advertising): Focus on matching the market's "Level of Awareness" to shift their psychological state.
    2. ALEX HORMOZI ($100M Offers): Focus on manipulating the Value Equation, risk reversal, and creating irresistible offers.
    3. NIR EYAL (Hooked Model): Focus on building habit-forming retention loops (Trigger -> Action -> Reward -> Investment).
    4. ROBERT CIALDINI (Influence): Focus on deploying the 6 Pillars of Persuasion (Reciprocity, Scarcity, Authority, Consistency, Liking, Consensus).
    
    STEP 1: Perform Chain-of-Thought reasoning.
    STEP 2: Generate the final campaign architecture.
    
    Output STRICTLY raw JSON. Do NOT use markdown formatting blocks (no ```json). 
    Follow this exact schema:
    {{
        "cognitive_reasoning": {{
            "framework_selected": "Name of the Guru Framework",
            "justification": "Why this framework perfectly solves the bottleneck (max 2 sentences)",
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
            # UPGRADED TEMPERATURE: Raised to 0.7 to unlock lateral thinking and variance
            response = gemini_client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=prompt,
                config={"temperature": 0.7} 
            )
            
            raw_text = response.text
            import re
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if not match:
                raise ValueError("Agent 4 failed to format cognitive output.")
                
            clean_json = match.group(0)
            strategy_config = json.loads(clean_json)
            
            record.status = "Validation Queue"
            db.commit()
            
            return {
                "status": "success",
                "agent": "Agent 4: Cognitive Strategy Architect",
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

async def run_strategy_agent(record_id: int, req: StrategyRequest, db: Session = Depends(get_db)):
    """Agent 4: Cognitive CMO using Framework Routing and Chain-of-Thought."""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")

    if not gemini_client:
        return {"status": "error", "message": "Gemini API Key missing."}

    # THE MASTER GURU PROMPT
    prompt = f"""
    You are Agent 4, an elite Chief Marketing Officer and Behavioral Psychologist for a Fortune 500 company.
    Agent 2 has diagnosed the following critical business bottleneck: "{req.diagnosis}"
    
    Your directive is to architect a multi-million-dollar marketing campaign to solve this exact bottleneck.
    
    CRITICAL INSTRUCTION: You must route this problem through ONE of the following elite frameworks:
    1. EUGENE SCHWARTZ (Breakthrough Advertising): Use if the problem is poor messaging or low conversion. Map the audience's "Level of Awareness" (Unaware, Problem Aware, Solution Aware, Product Aware, Most Aware) and match the hook to their state.
    2. ALEX HORMOZI ($100M Offers): Use if the problem is high Customer Acquisition Cost (CAC) or high churn. Apply the Value Equation: (Dream Outcome x Perceived Likelihood of Achievement) / (Time Delay x Effort & Sacrifice).
    3. NIR EYAL (Hooked Model): Use if the problem is user retention or engagement drop-offs. Design a habit-loop: Trigger -> Action -> Variable Reward -> Investment.
    4. ROBERT CIALDINI (Influence): Use if the problem is brand trust or cart abandonment. Inject Reciprocity, Scarcity, Authority, Consistency, Liking, or Consensus.
    
    STEP 1: Perform Chain-of-Thought reasoning.
    STEP 2: Generate the final campaign architecture.
    
    Output STRICTLY raw JSON. Do NOT use markdown formatting blocks (no ```json). 
    Follow this exact schema:
    {{
        "cognitive_reasoning": {{
            "framework_selected": "Name of the Guru Framework",
            "justification": "Why this framework perfectly solves the bottleneck (max 2 sentences)",
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
            # We use 3.1-flash-lite with a slightly higher temperature for creative, lateral thinking
            response = gemini_client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=prompt,
                config={"temperature": 0.4} 
            )
            
            raw_text = response.text
            
            # FAANG-Level Parsing: Extract only the JSON
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if not match:
                raise ValueError("Agent 4 failed to format cognitive output.")
                
            clean_json = match.group(0)
            strategy_config = json.loads(clean_json)
            
            record.status = "Validation Queue"
            db.commit()
            
            return {
                "status": "success",
                "agent": "Agent 4: Cognitive Strategy Architect",
                "strategy": strategy_config
            }
            
        except Exception as e:
            error_str = str(e)
            if "503" in error_str or "UNAVAILABLE" in error_str:
                if attempt < max_retries - 1:
                    logger.warning(f"Gemini Servers busy (503). Retrying... (Attempt {attempt + 1}/{max_retries})")
                    time.sleep(3)
                    continue
            logger.error(f"Agent 4 Cognitive Error: {error_str}")
            raise HTTPException(status_code=500, detail=f"Agent 4 crashed: {error_str}")

@app.post("/api/audit/{record_id}")
async def run_auditor_agent(record_id: int, req: AuditRequest, db: Session = Depends(get_db)):
    """Agent 5: Groq acts as the aggressive Red Team Auditor."""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
         raise HTTPException(status_code=404, detail="Database record not found.")
    
    prompt = f"""
    You are Agent 5, an aggressive, cynical Chief Revenue Officer and Brand Protector.
    Your job is to "Red Team" (stress-test and ruthlessly audit) this AI-generated marketing strategy:
    
    {req.strategy}
    
    CRITICAL INSTRUCTIONS:
    1. SCAM CHECK: If the strategy sounds like a hyper-aggressive, cheap internet scam, call it out. The tone must be realistic for a modern, high-trust enterprise environment.
    2. ORIGINALITY CHECK: If the strategy just relies on "giving a generic 10% discount," penalize it. We want psychological value, not lazy price slashing.
    3. FINANCIAL REALISM: Analyze if the Customer Acquisition Cost (CAC) will destroy margins based on this execution plan.
    
    Output STRICTLY raw JSON. Do NOT use markdown formatting blocks (no ```json). 
    Follow this exact schema:
    {{
        "approvalStatus": "APPROVED, APPROVED WITH CONDITIONS, or REJECTED",
        "confidenceScore": 85,
        "auditNotes": [
            "Brutally honest note about the psychological angle...",
            "Critique of the originality or tone (e.g., 'Sounds too scammy, tone down the urgency')..."
        ],
        "riskFactors": [
            "Specific financial risk (e.g., margin compression)...",
            "Specific brand risk (e.g., audience fatigue)..."
        ]
    }}
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # We use temperature 0.1 for the Auditor to keep it highly logical and strict
            response = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
                max_tokens=500
            )
            
            raw_text = response.choices[0].message.content
            
            # BULLETPROOF PARSING: Extract only the JSON
            import re
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if not match:
                raise ValueError("Agent 5 failed to format audit output.")
                
            clean_json = match.group(0)
            audit_config = json.loads(clean_json)
            
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
    """Agent 6: Groq performs Bayesian Scenario Modeling (Native JSON Mode)."""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")
    
    prompt = f"""
    You are Agent 6, an elite Quantitative Market Analyst.
    Review this finalized marketing strategy: 
    {req.strategy}
    
    Perform a Probabilistic Market Simulation (Bayesian Scenario Modeling).
    
    CRITICAL INSTRUCTIONS:
    - Output strictly valid JSON.
    - Do NOT use unescaped double quotes inside your text values.
    
    Schema to follow:
    {{
        "scenarios": {{
            "P90": {{ "ctr": "4.8%", "conversion": "3.5%", "roi": "210%" }},
            "P50": {{ "ctr": "2.1%", "conversion": "1.2%", "roi": "45%" }},
            "P10": {{ "ctr": "0.6%", "conversion": "0.3%", "roi": "-35%" }}
        }},
        "simulationNotes": "Explain the primary variable that shifts the timeline."
    }}
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.1, # Lowered to 0.1 for strict mathematical compliance
                max_tokens=400,
                response_format={"type": "json_object"} # <-- THE SILVER BULLET
            )
            
            # Because of JSON mode, we no longer need Regex. We can parse it directly.
            raw_text = response.choices[0].message.content
            sim_config = json.loads(raw_text)
            
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
    """Agent 7: Autonomous Multi-Channel Creative Director."""
    record = db.query(CampaignData).filter(CampaignData.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Database record not found.")
    
    prompt = f"""
    You are Agent 7, an elite Creative Director and Direct-Response Copywriter.
    You have been handed this finalized marketing strategy: 
    {req.strategy}
    
    CRITICAL INSTRUCTION: DO NOT use a fixed template. You must AUTONOMOUSLY DECIDE the 3 to 4 best marketing channels to execute this strategy. 
    (Examples: B2B LinkedIn Outreach, TikTok Video Script, Direct Mail Letter, Webinar Outline, SEO Blog Post, Influencer Brief, Realistic Campaign Brief, Customer Engagement Plans, etc.)
    
    STEP 1: Perform Chain-of-Thought reasoning to justify your channel selection.
    STEP 2: Write the high-converting copy for those specific channels.
    
    Output STRICTLY raw JSON. Do NOT use markdown formatting blocks (no ```json).
    Follow this exact schema:
    {{
        "copywriting_reasoning": {{
            "psychological_hook": "Explain the core human emotion/bias this copy triggers.",
            "channel_strategy": "Explain WHY you autonomously chose these specific channels for this audience."
        }},
        "assets": [
            {{
                "channel": "e.g., TikTok Video Script",
                "assetName": "e.g., The 'Contrarian Hook' Reel",
                "content": "The full script, direct-response copy, or outline. Use short paragraphs. Agitate pain, present solution, strong CTA."
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
            response = gemini_client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=prompt,
                config={"temperature": 0.6} # High enough to be creatively brilliant, low enough to stay on schema
            )
            
            raw_text = response.text
            import re
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if not match:
                raise ValueError("Agent 7 failed to format dynamic copy output.")
                
            clean_json = match.group(0)
            deploy_config = json.loads(clean_json)
            
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