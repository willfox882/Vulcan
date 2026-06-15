// Joint geometry — discriminated by joint type
export interface TJointGeometry {
  type: "t_joint";
  webThickness: number;
  flangeThickness: number;
  jointLength: number;
  weldSize: number;
}

export interface LapJointGeometry {
  type: "lap_joint";
  plate1Thickness: number;
  plate2Thickness: number;
  overlapLength: number;
  jointLength: number;
  weldSize: number;
  weldConfig: "both_sides" | "one_side";
}

export interface ButtJointGeometry {
  type: "butt_joint";
  plate1Thickness: number;
  plate2Thickness: number;
  grooveType: "square" | "v_groove" | "double_v" | "j_groove" | "u_groove";
  grooveAngle: number;       // degrees
  rootOpening: number;       // mm
  rootFace: number;          // mm
  penetration: "full" | "partial";
  partialPenetrationDepth?: number;  // mm, only for partial
}

export interface CornerJointGeometry {
  type: "corner_joint";
  plate1Thickness: number;
  plate2Thickness: number;
  jointLength: number;
  cornerAngle: number;       // degrees, default 90
  weldConfig: "inside" | "outside" | "both";
  weldSizeInside: number;
  weldSizeOutside: number;
}

export interface EdgeJointGeometry {
  type: "edge";
  plate1Thickness: number;
  plate2Thickness: number;
  jointLength: number;
  weldSize: number;
}

export interface CruciformJointGeometry {
  type: "cruciform";
  webThickness: number;
  flangeThickness: number;
  jointLength: number;
  weldSize: number;
}

export type JointGeometry = TJointGeometry | LapJointGeometry | ButtJointGeometry | CornerJointGeometry | EdgeJointGeometry | CruciformJointGeometry;

// Load cases — typed by analysis type
export interface StaticLoadValues {
  Fx: number; Fy: number; Fz: number;
  Mx: number; My: number; Mz: number;
}

export interface StaticLoadCase {
  id: string;
  name: string;
  type: "static";
  category: "D" | "L" | "W" | "S" | "E" | "O";  // Dead/Live/Wind/Snow/Seismic/Operating
  forces: StaticLoadValues;
}

export interface CyclicLoadCase {
  id: string;
  name: string;
  type: "cyclic";
  stressRangeMPa: number;
  frequencyHz: number;
  hoursPerDay: number;
  daysPerYear: number;
  /** Orientation of stress relative to the weld axis (drives fatigue category). */
  loadDirection?: "transverse" | "parallel";
}

export interface SpectrumEntry {
  stressRangeMPa: number;
  cycles: number;
}

export interface SpectrumLoadCase {
  id: string;
  name: string;
  type: "spectrum";
  spectrum: SpectrumEntry[];
  frequencyHz: number;
  hoursPerDay: number;
  daysPerYear: number;
  /** Orientation of stress relative to the weld axis (drives fatigue category). */
  loadDirection?: "transverse" | "parallel";
}

export type LoadCaseItem = StaticLoadCase | CyclicLoadCase | SpectrumLoadCase;

export interface Material {
  id: string;
  name: string;
  type: "carbon_steel" | "stainless" | "aluminum";
  Fy: number;
  Fu: number;
  F_EXX: number;
  unit: string;
  chemistry?: Record<string, number>;
  requires_pwht?: boolean;
  aws_table_5_8_category?: string;
}

export interface ServiceConditions {
  codeBasis: "ASD" | "LRFD";
  designLife: number;
  operatingFrequency: number;
  position: "1F" | "2F" | "3F" | "4F" | "1G" | "2G" | "3G" | "4G";
  environment: "shop" | "outdoor" | "field";
  productionVolume: "one_off" | "repeat" | "mass";
  qualityLevel: "cosmetic" | "structural" | "code" | "radiographic";
}

export interface Joint {
  id: string;
  name: string;
  type: "t_joint" | "lap_joint" | "butt_joint" | "corner_joint" | "edge" | "cruciform" | "plug_slot";
  geometry: JointGeometry;
  material: Material;
  loadCases: LoadCaseItem[];
  service: ServiceConditions;
}

export interface CustomMaterial extends Material {
  isCustom: true;
  notes?: string;
}

export interface LibraryLoadCase {
  id: string;
  name: string;
  description?: string;
  loadCase: LoadCaseItem;
}

export interface VulcanProject {
  metadata: {
    name: string;
    version: string;
    createdAt: string;
    modifiedAt: string;
  };
  joints: Joint[];
  activeJointId: string | null;
  customMaterials: CustomMaterial[];
  loadCaseLibrary: LibraryLoadCase[];
}

// Structural result shape (Phase 2 - both methods)
export interface StructuralMethodResult {
  method: string;
  f_v: number;
  f_t: number;
  f_b: number;
  f_R: number;
  F_w_allow: number;
  utilization: number;
  utilization_pct: number;
  w_required: number;
  w_provided: number;
  adequate: boolean;
  L_total?: number;
  governing_corner?: [number, number];
  I_ux?: number;
  J_u?: number;
}

export interface ValidationResult {
  w_min_aws: number;
  w_max_aws: number;
  warnings: Array<{
    severity: "error" | "warning" | "info";
    message: string;
    code_clause: string;
  }>;
}

export interface SymbolResult {
  type: string;
  weld_type: string;
  size: number;
  configuration: string;
  notation: string;
  svg?: string;
  all_around?: boolean;
  field_weld?: boolean;
  tail?: string;
  groove_angle?: number;
  root_opening?: number;
  contour?: string;
  finish?: string;
  length?: number;
  pitch?: number;
}

export interface FatigueResult {
  category: string;
  category_description: string;
  Cf: number;
  m: number;
  threshold_MPa: number;
  stress_range_MPa: number | null;
  cycles_to_failure: number | null;
  damage: number | null;
  below_threshold: boolean;
  service_life_years: number | null;
  cycles_per_year: number | null;
  safety_factor: number | null;
  passes: boolean | null;
}

export interface ProcessResult {
  ranked_processes: Array<{ process: string; score: number; rationale: string[] }>;
  primary: string;
  filler: { classification: string; comment: string };
}

export interface MetallurgyResult {
  carbon_equivalent: { CE_IIW: number; Pcm: number; CET: number };
  preheat: {
    aws_table_C: number;
    yurioka_C: number;
    required_C: number;
    method_governing: string;
  };
  heat_input: { min_kJ_per_mm: number; max_kJ_per_mm: number; recommended_kJ_per_mm: number };
  cooling_time_t85: { value_s: number; regime: string; transition_thickness_mm: number; recommended_range_s: [number, number] };
  pwht_required: boolean;
  hydrogen_class: string;
}

export interface DistortionResult {
  angular_deg: { min: number; expected: number; max: number };
  transverse_shrinkage_mm: { min: number; expected: number; max: number };
  longitudinal_shrinkage_mm: { min: number; expected: number; max: number };
  mitigations: string[];
  note: string;
}

export interface AnalysisResult {
  structural_elastic: StructuralMethodResult;
  structural_ic: StructuralMethodResult | null;   // null for butt joints
  structural_governing: StructuralMethodResult;
  validation: ValidationResult;
  symbol: SymbolResult;
  fatigue: FatigueResult | null;   // null when no cyclic load case
  process: ProcessResult | null;
  metallurgy: MetallurgyResult | null;
  distortion: DistortionResult | null;
}
