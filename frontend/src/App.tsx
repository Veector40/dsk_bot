import React, { useState, useEffect } from 'react';
import { 
  Inbox, BrainCircuit, Send, AlertTriangle, Building2, 
  CreditCard, MapPin, FileText, Loader2, Plus, MessageSquare,
  History, Clock, CheckCircle2
} from 'lucide-react';

interface ExtractedData {
  company_name: string;
  eik: string;
  requested_credit_amount: string;
  pos_quantity: string | number;
  locations: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  flag_reason: string;
  draft_reply: string;
}

interface HistoryItem {
  id: number;
  original_text: string;
  company_name: string;
  eik: string;
  requested_amount: string;
  pos_details: string;
  priority: string;
  status: string;
  flag_reason: string;
  draft_reply: string;
  created_at: string;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExtractedData | null>(null);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

  // Fetch history on component mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const handleNewRequest = () => {
    setSelectedHistoryId(null);
    setResult(null);
    setInputText('');
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setSelectedHistoryId(item.id);
    setInputText(item.original_text);
    
    // Parse the pos_details string back into our UI format
    const posMatch = item.pos_details.match(/^(.*?) \(Loc: (.*?)\)$/);
    const pos_qty = posMatch ? posMatch[1] : item.pos_details;
    const locs = posMatch ? posMatch[2] : "N/A";

    setResult({
      company_name: item.company_name,
      eik: item.eik,
      requested_credit_amount: item.requested_amount,
      pos_quantity: pos_qty,
      locations: locs,
      priority: item.priority as 'HIGH' | 'MEDIUM' | 'LOW',
      status: item.status,
      flag_reason: item.flag_reason,
      draft_reply: item.draft_reply
    });
  };

  // Real API Call to Langflow MCP Tool
  const handleProcess = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    setResult(null);
    setSelectedHistoryId(null);

    try {
      const payload = {
        jsonrpc: "2.0",
        id: `react_${Date.now()}`,
        method: "tools/call", 
        params: {
          name: "the_extractor",
          arguments: { input_value: inputText }
        }
      };

      const response = await fetch('/langflow-api/api/v1/mcp/project/b3aebfbe-bd77-4fed-b575-3bc64d3c76f0/streamable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Langflow API error: ${response.status}`);

      const rawText = await response.text();
      const dataLine = rawText.split('\n').find(line => line.startsWith('data: '));
      if (!dataLine) throw new Error("No data received from Langflow stream.");

      const jsonRpcResponse = JSON.parse(dataLine.replace(/^data: /, ''));
      const contents = jsonRpcResponse?.result?.content;
      if (!contents || contents.length === 0) throw new Error("Invalid MCP response.");
      
      let extractedText = contents[contents.length - 1].text;
      extractedText = extractedText.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsedResult = JSON.parse(extractedText);
      
      const finalResult: ExtractedData = {
        company_name: parsedResult.company_name || "Unknown",
        eik: parsedResult.eik || "Unknown",
        requested_credit_amount: parsedResult.credit_amount 
          ? `${parsedResult.credit_amount.toLocaleString()} ${parsedResult.currency || 'BGN'}` 
          : "N/A",
        pos_quantity: parsedResult.pos_action === 'RETURN' 
          ? `RETURN ${parsedResult.pos_quantity}` 
          : parsedResult.pos_quantity || 0,
        locations: Array.isArray(parsedResult.locations) && parsedResult.locations.length > 0 
          ? parsedResult.locations.join(", ") 
          : "N/A",
        priority: parsedResult.priority || "MEDIUM",
        status: parsedResult.status || "Pending",
        flag_reason: parsedResult.flag_reason || "None",
        draft_reply: parsedResult.draft_reply || ""
      };

      setResult(finalResult);

      // Save to SQLite Database
      try {
        await fetch('/api/save-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_text: inputText,
            company_name: finalResult.company_name,
            eik: finalResult.eik,
            requested_amount: finalResult.requested_credit_amount,
            pos_details: `${finalResult.pos_quantity} (Loc: ${finalResult.locations})`,
            priority: finalResult.priority,
            status: finalResult.status,
            flag_reason: finalResult.flag_reason,
            draft_reply: finalResult.draft_reply
          })
        });
        // Refresh the sidebar
        fetchHistory();
      } catch (dbError) {
        console.error("Failed to save to DB:", dbError);
      }

    } catch (error) {
      console.error("Error processing document:", error);
      alert("Failed to process document. Make sure Langflow is running!");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f4f7f6] overflow-hidden text-gray-800 font-sans">
      
      {/* Sidebar (ChatGPT Style) */}
      <div className="w-80 bg-gray-900 text-gray-300 flex flex-col shadow-2xl z-10 shrink-0">
        <div className="p-4">
          <button 
            onClick={handleNewRequest}
            className="w-full bg-[#4EB92D]/10 hover:bg-[#4EB92D]/20 text-[#4EB92D] border border-[#4EB92D]/30 font-semibold py-3 px-4 rounded-xl transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Triage Request
          </button>
        </div>
        
        <div className="px-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4" /> Recent History
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
          {history.length === 0 ? (
            <div className="text-center text-gray-600 text-sm mt-8">No requests yet.</div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1.5 ${
                  selectedHistoryId === item.id 
                    ? 'bg-gray-800 text-white shadow-sm' 
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <div className="text-sm font-medium truncate flex items-center justify-between">
                  <span className="truncate pr-2">{item.company_name !== 'Unknown' && item.company_name ? item.company_name : 'Unknown Entity'}</span>
                  {/* Status Indicator Dot */}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    item.status === 'AUTO_APPROVED' ? 'bg-[#4EB92D]' :
                    item.status === 'IGNORED' ? 'bg-gray-500' : 'bg-red-500'
                  }`} />
                </div>
                <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  {item.original_text.substring(0, 40)}...
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <header className="px-8 py-6 flex items-center justify-between bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#4EB92D] p-2.5 rounded-xl shadow-md shadow-[#4EB92D]/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">DSK Smart Triage</h1>
              <p className="text-gray-500 font-medium text-xs">AI Operations & Automation Desk</p>
            </div>
          </div>
          {selectedHistoryId && (
            <div className="flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              <Clock className="w-4 h-4" /> Viewing Historical Record
            </div>
          )}
        </header>

        {/* 3-Column Grid Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto">
            
            {/* Column 1: Inbox */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-[700px] xl:col-span-1">
              <div className="flex items-center gap-2 mb-4 text-[#4EB92D]">
                <Inbox className="w-5 h-5" />
                <h2 className="font-bold text-lg text-gray-800">1. Inbox</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">Paste the incoming customer request below.</p>
              
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                readOnly={selectedHistoryId !== null}
                placeholder="Dear DSK Bank,&#10;&#10;We would like to request a credit line of 50,000 BGN..."
                className={`flex-1 w-full border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4EB92D]/50 transition-all mb-4 resize-none ${
                  selectedHistoryId !== null ? 'bg-gray-100 border-gray-200 text-gray-600' : 'bg-gray-50 border-gray-200 focus:border-[#4EB92D]'
                }`}
              />
              
              <button 
                onClick={handleProcess}
                disabled={isProcessing || !inputText.trim() || selectedHistoryId !== null}
                className="w-full bg-[#4EB92D] hover:bg-[#43a127] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                {isProcessing ? 'Analyzing Data...' : selectedHistoryId ? 'Archived Record' : 'Process Document'}
              </button>
            </div>

            {/* Column 2: Analysis & Extraction */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-[700px] xl:col-span-2">
              <div className="flex items-center gap-2 mb-6 text-[#4EB92D]">
                <BrainCircuit className="w-5 h-5" />
                <h2 className="font-bold text-lg text-gray-800">2. AI Analysis & Extraction</h2>
              </div>

              {!result && !isProcessing && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p>Awaiting document processing...</p>
                </div>
              )}

              {isProcessing && (
                <div className="flex-1 flex flex-col items-center justify-center text-[#4EB92D]">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-medium animate-pulse">Running Multi-Agent Extraction...</p>
                </div>
              )}

              {result && !isProcessing && (
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard icon={<Building2 />} label="Company Name" value={result.company_name} />
                    <InfoCard icon={<FileText />} label="EIK Number" value={result.eik} />
                    <InfoCard icon={<CreditCard />} label="Requested Amount" value={result.requested_credit_amount} />
                    <InfoCard icon={<CreditCard />} label="POS Terminals" value={result.pos_quantity.toString()} />
                    <InfoCard icon={<MapPin />} label="Locations" value={result.locations} fullWidth />
                  </div>
                </div>
              )}
            </div>

            {/* Column 3: Routing & Action */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-[700px] xl:col-span-1">
              <div className="flex items-center gap-2 mb-6 text-[#4EB92D]">
                <Send className="w-5 h-5" />
                <h2 className="font-bold text-lg text-gray-800">3. Routing & Action</h2>
              </div>

              {!result ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm text-center">
                  Process a document to see routing actions.
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="mb-6 space-y-4">
                    <div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Risk Priority</span>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        result.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 
                        result.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 
                        'bg-[#4EB92D]/10 text-[#4EB92D]'
                      }`}>
                        {result.priority}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">System Status</span>
                      <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        {result.status === 'AUTO_APPROVED' && <CheckCircle2 className="w-4 h-4 text-[#4EB92D]" />}
                        {result.status}
                      </div>
                    </div>

                    {result.flag_reason && result.flag_reason !== "None" && (
                      <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                        <div className="flex items-start gap-2 text-orange-800 text-sm">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <p className="font-medium leading-tight">{result.flag_reason}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="border-gray-100 mb-4" />

                  <div className="flex-1 flex flex-col">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">AI Drafted Reply</span>
                    <textarea 
                      readOnly
                      value={result.draft_reply}
                      className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4EB92D]/50 resize-none mb-4 text-gray-700"
                    />
                    <button className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />
                      {selectedHistoryId ? 'Re-send Reply' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// Small helper component for the extraction grid
function InfoCard({ icon, label, value, fullWidth = false }: { icon: React.ReactNode, label: string, value: string, fullWidth?: boolean }) {
  const isMissing = value === "Unknown" || value === "N/A" || !value;
  return (
    <div className={`bg-gray-50 p-4 rounded-2xl border border-gray-100 ${fullWidth ? 'col-span-2' : 'col-span-1'} ${isMissing ? 'bg-red-50 border-red-100' : ''}`}>
      <div className={`flex items-center gap-2 mb-2 ${isMissing ? 'text-red-400' : 'text-gray-400'}`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-semibold ${isMissing ? 'text-red-700 italic' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
