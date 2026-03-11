# 🏦 Bank DSK: AI Architect Pipeline

### UNWE Hackathon 2026 | Technical Submission

This repository contains a high-performance, multi-agent LLM pipeline designed to automate the processing of unstructured bank requests (emails, letters, documents) for **Bank DSK**. The system is built using the **Model Context Protocol (MCP)** and **Langflow**, ensuring a secure, modular, and human-in-the-loop compliant architecture.

## 🏗 System Architecture

The pipeline follows a "Secure Compliance Engine" design, splitting the work into three specialized agents:

1. **Agent 1 (Classification):** Identifies the type of request (Business, Complaint, or General Inquiry).
2. **Agent 2 (Extraction):** Extracts structured data (Company Name, EIK, Credit Amount, POS Quantity) into a standardized JSON format.
3. **Agent 3 (The Validator):** Our "Secret Weapon." It applies Bank DSK's specific business rules (e.g., flagging credit requests > 100k or missing installation locations) and determines if the request can be `AUTO_APPROVED` or requires `HUMAN_REVIEW`.

---

## 🛠 Tech Stack

* **Orchestration:** [Langflow](https://github.com/langflow-ai/langflow) (v1.8.0)
* **Protocol:** MCP (Model Context Protocol) via `mcp-proxy`
* **LLM Integration:** Multi-agent Logic (GPT-4o / Claude 3.5 Sonnet)
* **Testing:** Bash, `curl`, and `jq` for automated validation

---

## 🚀 Getting Started

### 1. Prerequisites

Ensure you have Python 3.10+ and the necessary tools installed:

```bash
pip install langflow mcp-proxy
sudo dnf install jq  # For Fedora/Linux

```

### 2. Importing the Flow

1. Open Langflow: `langflow run`.
2. Navigate to `http://localhost:7860`.
3. Click **Upload** and select the JSON flow file found in this repository.
4. Update your `mcp_settings.json` with your unique Project ID:
```json
{
  "mcpServers": {
    "dsk-ai-pipeline": {
      "command": "uvx",
      "args": ["mcp-proxy", "--transport", "streamablehttp", "http://localhost:7860/api/v1/mcp/project/YOUR_PROJECT_ID/streamable"]
    }
  }
}

```



### 3. Running Automated Tests

We have included a test suite (`test_logic.sh`) to verify the Validator logic against three critical bank scenarios:

* **Test 1:** High Credit Risk (> 100,000 BGN).
* **Test 2:** Missing POS installation locations.
* **Test 3:** Automatic filtering of customer complaints.

**Run the tests:**

```bash
chmod +x test_logic.sh
./test_logic.sh

```

---

## 📊 Business Logic (The "Validator" Rules)

Our Agent 3 is programmed with specific Bulgarian banking regulations:

| Rule | Trigger | Action |
| --- | --- | --- |
| **Empty Request** | Empty JSON `{}` | `STATUS: IGNORED` |
| **Missing Data** | No EIK or Company Name | `STATUS: REQUIRES_HUMAN_REVIEW` |
| **High Risk** | Credit Amount > 100,000 | `PRIORITY: HIGH` |
| **POS Logistics** | POS requested, but no location | `PRIORITY: MEDIUM` |

---

## 💡 Pitch Strategy: Why This Wins

* **Compliance first:** We don't trust the AI to make final credit decisions. We use it to **filter and prioritize**, ensuring Bank DSK staff only spend time on high-value or high-risk tasks.
* **SLA Improvement:** Reduces initial response time from **days to minutes**.
* **Scalability:** The MCP protocol allows this "Extractor" tool to be plugged into any existing Bank DSK software (Mobile App, CRM, or Employee Portal).

---

## 📁 Repository Structure

* `/mock_data`: Sample Bulgarian emails for testing.
* `/prompts`: The system instructions for the 3 Agents.
* `test_logic.sh`: The automated bash test runner.
* `flow_export.json`: The Langflow architecture file.
