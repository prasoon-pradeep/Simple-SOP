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
