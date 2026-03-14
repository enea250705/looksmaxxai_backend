/**
 * Response shape from Claude - must match prompt output.
 * App (React Native) uses the same shape for display.
 */
export interface FaceAnalysis {
  overall: {
    psl_score: number;
    tier_label: string;
    potential_score: number;
  };
  regions: {
    eyes: RegionEyes;
    midface: RegionMidface;
    lower_third: RegionLowerThird;
    cheekbones: RegionCheekbones;
    symmetry: RegionSymmetry;
    skin: RegionSkin;
    hair: RegionHair;
    dimorphism: RegionDimorphism;
  };
  summary: {
    brutal_summary: string[];
    maxxing_suggestions: string[];
  };
}

interface RegionEyes {
  score: number;
  canthal_tilt: { label: string; degrees: number };
  hooding: string;
  spacing: string;
  notes: string[];
}

interface RegionMidface {
  score: number;
  ratio: string;
  projection: string;
  compactness: string;
  notes: string[];
}

interface RegionLowerThird {
  score: number;
  jaw_angle_degrees: number;
  chin_projection: string;
  mandible_definition: string;
  notes: string[];
}

interface RegionCheekbones {
  score: number;
  projection: string;
  notes: string[];
}

interface RegionSymmetry {
  score: number;
  overall: string;
  notes: string[];
}

interface RegionSkin {
  score: number;
  issues: string[];
  notes: string[];
}

interface RegionHair {
  score: number;
  hairline: string;
  density: string;
  notes: string[];
}

interface RegionDimorphism {
  score: number;
  label: string;
  notes: string[];
}

export interface RateFaceRequestBody {
  imageBase64: string;
  age?: string;
  gender?: string;
  goal?: string;
}
