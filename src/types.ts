export interface SOP {
  id: string;
  sop_id: string;
  version: number;
  title: string;
  project_tag: string | null;
  department: string | null;
  document_owner: string | null;
  created_by: string | null;
  created_date: string | null;
  active_date: string | null;
  next_review_date: string | null;
  approval_status: string | null;
  regulatory_ref: string | null;
  distribution_list: string | null;
  related_documents: string | null;
  purpose: string | null;
  scope: string | null;
  safety_notes: string | null;
  training_required: boolean;
  training_details: string | null;
  created_at: string;
  updated_at: string;
  cycle_time_value: number | null;
  cycle_time_unit: string | null;
  cycle_time_notes: string | null;
  translations_disabled: boolean;
}

export interface Revision {
  id: string;
  sop_id: string;
  version: number;
  revision_notes: string;
  revised_by: string | null;
  revision_date: string;
  approval_status: string | null;
  approved_by: string | null;
  approval_date: string | null;
}

export interface Definition {
  id: string;
  sop_id: string;
  term: string;
  meaning: string;
  sort_order: number;
}

export interface Tool {
  id: string;
  sop_id: string;
  name: string;
  type: string | null;
  model_part_no: string | null;
  specification: string | null;
  image_uuid: string | null;
  calibration_required: boolean;
  calibration_due_date: string | null;
  source_tool_uuid: string | null;
}

export interface Item {
  id: string;
  sop_id: string;
  name: string;
  part_no: string | null;
  description: string | null;
  image_uuid: string | null;
  unit: string | null;
  qty: string | null;
  source_item_uuid: string | null;
}

export interface Step {
  id: string;
  sop_id: string;
  step_number: number;
  action: string | null;
  notes: string | null;
  expected_output: string | null;
  sort_order: number;
}

export interface StepImage {
  id: string;
  step_id: string;
  image_uuid: string;
  sort_order: number;
}

export interface StepTool {
  id: string;
  step_id: string;
  tool_id: string | null;
  free_text: string | null;
}

export interface StepItem {
  id: string;
  step_id: string;
  item_id: string | null;
  free_text: string | null;
  quantity: number | null;
  unit: string | null;
}

export interface StepFull {
  step: Step;
  images: StepImage[];
  tools: StepTool[];
  items: StepItem[];
}

export interface AiEnhancement {
  id: string;
  sop_id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  original_text: string;
  enhanced_text: string;
  provider: string;
  model: string;
  enhanced_at: string;
}

export interface AiTranslation {
  id: string;
  sop_id: string;
  entity_type: 'step' | 'sop';
  entity_id: string;
  field_name: string;
  language: string;
  translated_text: string;
  source_hash: string;
  edited: boolean;
  provider: string;
  model: string;
  translated_at: string;
}

// Mirrors SUPPORTED_LANGUAGES in src-tauri/src/commands.rs — keep in sync.
export const SUPPORTED_LANGUAGES: { code: string; name: string }[] = [
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'kn', name: 'Kannada' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
];

// Fixed boilerplate — hand-translated once rather than an AI call per render,
// since the wording never changes per-document. {names} is substituted with
// the (untranslated) list of language names, e.g. "Hindi, Tamil".
// Mirrors DISCLAIMER_TEXT in public/pdf-template.html — keep in sync.
export const DISCLAIMER_TEXT: Record<string, string> = {
  hi: 'इस दस्तावेज़ में AI-जनित अनुवाद ({names}) मूल अंग्रेज़ी पाठ के नीचे धूसर रंग में दिखाए गए हैं। अनुवाद की समीक्षा नहीं की गई है। किसी भी विसंगति की स्थिति में, अंग्रेज़ी संस्करण ही प्रामाणिक होगा।',
  ta: 'இந்த ஆவணத்தில் AI-உருவாக்கிய மொழிபெயர்ப்புகள் ({names}) அசல் ஆங்கில உரையின் கீழ் சாம்பல் நிறத்தில் காட்டப்பட்டுள்ளன. மொழிபெயர்ப்புகள் மறுஆய்வு செய்யப்படவில்லை. ஏதேனும் முரண்பாடு ஏற்பட்டால், ஆங்கில பதிப்பே அதிகாரப்பூர்வமானது.',
  ml: 'ഈ ഡോക്യുമെന്റിൽ AI ജനറേറ്റ് ചെയ്ത പരിഭാഷകൾ ({names}) യഥാർത്ഥ ഇംഗ്ലീഷ് വാചകത്തിന് താഴെ ചാര നിറത്തിൽ കാണിച്ചിരിക്കുന്നു. പരിഭാഷകൾ അവലോകനം ചെയ്തിട്ടില്ല. ഏതെങ്കിലും പൊരുത്തക്കേട് ഉണ്ടായാൽ, ഇംഗ്ലീഷ് പതിപ്പായിരിക്കും ആധികാരികം.',
  kn: 'ಈ ದಾಖಲೆಯಲ್ಲಿ AI-ರಚಿತ ಅನುವಾದಗಳನ್ನು ({names}) ಮೂಲ ಇಂಗ್ಲಿಷ್ ಪಠ್ಯದ ಕೆಳಗೆ ಬೂದು ಬಣ್ಣದಲ್ಲಿ ತೋರಿಸಲಾಗಿದೆ. ಅನುವಾದಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ. ಯಾವುದೇ ವ್ಯತ್ಯಾಸ ಉಂಟಾದರೆ, ಇಂಗ್ಲಿಷ್ ಆವೃತ್ತಿಯೇ ಅಧಿಕೃತವಾಗಿರುತ್ತದೆ.',
  te: 'ఈ పత్రంలో AI ద్వారా రూపొందించిన అనువాదాలు ({names}) అసలైన ఆంగ్ల వచనం క్రింద బూడిద రంగులో చూపబడ్డాయి. అనువాదాలు సమీక్షించబడలేదు. ఏదైనా వ్యత్యాసం ఉంటే, ఆంగ్ల వెర్షనే అధికారికమైనది.',
  mr: 'या दस्तऐवजात AI-निर्मित भाषांतरे ({names}) मूळ इंग्रजी मजकुराच्या खाली करड्या रंगात दर्शविली आहेत. भाषांतरांचे पुनरावलोकन केलेले नाही. कोणतीही विसंगती आढळल्यास, इंग्रजी आवृत्ती अधिकृत असेल.'
};

