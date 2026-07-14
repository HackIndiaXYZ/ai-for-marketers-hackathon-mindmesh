import axios from 'axios';

// Ensure this points to your backend URL (localhost for dev, Render for production)
const API_URL = 'https://apex-marketing-os.vercel.app/'; 

export const checkBackendStatus = async () => {
    try {
        const response = await axios.get(`${API_URL}/`);
        return response.data;
    } catch (error) {
        console.error("Backend connection failed:", error);
        return null;
    }
};

export const uploadDataForIngestion = async (files, brandName, brandTone) => {
    const formData = new FormData();
    
    // Append multiple files to the same 'files' key
    Array.from(files).forEach((file) => {
        formData.append('files', file); 
    });

    // Inject Brand Memory into the payload
    formData.append('brand_name', brandName || "Generic Brand");
    formData.append('brand_tone', brandTone || "Professional");

    try {
        const response = await axios.post(`${API_URL}/api/ingest/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error("Upload failed:", error);
        throw error;
    }
};

export const triggerDiagnosticAgent = async (recordId) => {
    try {
        const response = await axios.post(`${API_URL}/api/diagnose/${recordId}`);
        return response.data;
    } catch (error) {
        console.error("Diagnostic Agent failed:", error);
        throw error;
    }
};

export const triggerVisualizationAgent = async (recordId, diagnosisText) => {
    try {
        const response = await axios.post(`${API_URL}/api/visualize/${recordId}`, {
            diagnosis: diagnosisText
        });
        return response.data;
    } catch (error) {
        console.error("Visualization Agent failed:", error);
        throw error;
    }
};

export const triggerStrategyAgent = async (recordId, diagnosisText) => {
    try {
        const response = await axios.post(`${API_URL}/api/strategy/${recordId}`, {
            diagnosis: diagnosisText
        });
        return response.data;
    } catch (error) {
        console.error("Strategy Agent failed:", error);
        throw error;
    }
};

export const triggerAuditorAgent = async (recordId, strategyData) => {
    try {
        const response = await axios.post(`${API_URL}/api/audit/${recordId}`, {
            strategy: JSON.stringify(strategyData)
        });
        return response.data;
    } catch (error) {
        console.error("Auditor Agent failed:", error);
        throw error;
    }
};

export const triggerSimulationAgent = async (recordId, strategyData) => {
    try {
        const response = await axios.post(`${API_URL}/api/simulate/${recordId}`, {
            strategy: JSON.stringify(strategyData)
        });
        return response.data;
    } catch (error) {
        console.error("Simulation Agent failed:", error);
        throw error;
    }
};

export const triggerDeploymentAgent = async (recordId, strategyData) => {
    try {
        const response = await axios.post(`${API_URL}/api/deploy/${recordId}`, {
            strategy: JSON.stringify(strategyData)
        });
        return response.data;
    } catch (error) {
        console.error("Deployment Agent failed:", error);
        throw error;
    }
};