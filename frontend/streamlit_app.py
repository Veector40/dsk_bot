import streamlit as st
import time

# Must be the first Streamlit command
st.set_page_config(page_title="DSK Smart Triage & Operations Desk", layout="wide")

# Custom CSS for DSK Bank Green
st.markdown("""
    <style>
    .stButton>button {
        background-color: #007A33;
        color: white;
        border: none;
    }
    .stButton>button:hover {
        background-color: #005A25;
        color: white;
    }
    h1, h2, h3 {
        color: #007A33;
    }
    </style>
""", unsafe_allow_html=True)

def call_langflow_api(text):
    """
    Mock backend API call to Langflow/AI Agent.
    Replace this with your actual requests.post() logic.
    """
    time.sleep(2) # Simulate network delay
    return {
        "company_name": "Tech Solutions Ltd.",
        "eik": "BG123456789",
        "requested_credit_amount": "50,000 BGN",
        "pos_quantity": 5,
        "locations": "Sofia, Plovdiv",
        "priority": "HIGH",
        "status": "Requires Human Review",
        "flag_reason": "High credit amount requested without prior history.",
        "draft_reply": "Dear Client,\n\nThank you for your request for a 50,000 BGN credit line and 5 POS terminals. Our team is currently reviewing your application. We may need additional documentation regarding your business history.\n\nBest regards,\nDSK Bank Operations"
    }

st.title("🏦 DSK Smart Triage & Operations Desk")

# Create 3 columns with the requested width ratios (1 : 2 : 1)
col1, col2, col3 = st.columns([1, 2, 1])

with col1:
    st.subheader("📥 Inbox")
    email_input = st.text_area(
        "Paste Incoming Email/Text:", 
        height=300, 
        placeholder="Dear DSK Bank,\n\nWe would like to request a credit line of 50,000 BGN for our new offices in Sofia and Plovdiv. We also need 5 POS terminals.\n\nCompany: Tech Solutions Ltd.\nEIK: BG123456789"
    )
    process_btn = st.button("Process Document", use_container_width=True)

with col2:
    st.subheader("🧠 AI Analysis & Extraction")
    
    if process_btn and email_input:
        with st.spinner("Analyzing document..."):
            result = call_langflow_api(email_input)
            st.session_state['result'] = result
    
    if 'result' in st.session_state:
        res = st.session_state['result']
        st.markdown("### Extracted Data")
        
        # Display extracted data cleanly
        st.write(f"**Company Name:** {res['company_name']}")
        st.write(f"**EIK:** {res['eik']}")
        st.write(f"**Requested Credit Amount:** {res['requested_credit_amount']}")
        st.write(f"**POS Quantity:** {res['pos_quantity']}")
        st.write(f"**Locations:** {res['locations']}")
    elif not process_btn:
        st.info("Awaiting document processing. Paste an email and click 'Process Document'.")

with col3:
    st.subheader("⚡ Routing & Action")
    
    if 'result' in st.session_state:
        res = st.session_state['result']
        
        st.markdown("**Priority:**")
        if res['priority'] == "HIGH":
            st.error(res['priority'])
        elif res['priority'] == "MEDIUM":
            st.warning(res['priority'])
        else:
            st.success(res['priority'])
            
        st.markdown(f"**Status:** {res['status']}")
        st.markdown(f"**Flag Reason:** {res['flag_reason']}")
        
        st.markdown("---")
        st.markdown("**AI Drafted Email Reply:**")
        st.text_area("Review and edit before sending:", value=res['draft_reply'], height=200, label_visibility="collapsed")
        
        if st.button("Send Reply", use_container_width=True):
            st.success("Reply sent successfully!")
    else:
        st.info("No actions available yet.")
