import type { Household, Profile } from "./rules/types";

// Synthetic personas — no real user data. They represent the people the
// research is about: poor, low-literacy, often rural families who are entitled
// to benefits but blocked by the documentation trap and the awareness gap.

const HH = (over: Partial<Household> = {}): Household => ({
  isWidow: false,
  isPregnantOrLactating: false,
  hasSchoolGoingChild: false,
  hasElderly60Plus: false,
  lacksPuccaHouse: false,
  lacksLpg: false,
  isRural: true,
  ...over,
});

export interface Persona {
  id: string;
  name: string;
  blurb: string;
  freeText: string;
  profile: Profile;
}

export const PERSONAS: Persona[] = [
  {
    id: "sunita",
    name: "Meena — widow, 2 kids, only Aadhaar",
    blurb: "44, widow, OBC, BPL family in rural Bihar. Two school-going children. Has only an Aadhaar card.",
    freeText:
      "मेरा नाम मीना है, उम्र 44। मेरे पति की मृत्यु हो गई है। मैं बिहार के गाँव में रहती हूँ, घर में राशन भी मुश्किल से चलता है। मेरे दो बच्चे स्कूल जाते हैं। मेरे पास सिर्फ़ आधार कार्ड है। मुझे क्या-क्या मिल सकता है?",
    profile: {
      name: "Meena",
      language: "hi",
      state: "BIHAR",
      category: "OBC",
      age: 44,
      gender: "female",
      annualHouseholdIncome: 95000,
      bpl: true,
      occupation: "informal",
      disability: "none",
      household: HH({ isWidow: true, hasSchoolGoingChild: true, lacksLpg: true, isRural: true }),
      documentsHave: ["aadhaar"],
    },
  },
  {
    id: "ramlal",
    name: "Harilal — 65, landless SC labourer, no caste cert",
    blurb: "65, SC, landless daily-wage worker in rural Rajasthan, BPL. Has Aadhaar + ration card but no caste certificate.",
    freeText:
      "I am Harilal, 65 years old, from a village in Rajasthan. I belong to a Scheduled Caste and work as a daily-wage labourer. I have an Aadhaar and a ration card but no caste certificate. I have no land. What can I get?",
    profile: {
      name: "Harilal",
      language: "en",
      state: "RAJASTHAN",
      category: "SC",
      age: 65,
      gender: "male",
      annualHouseholdIncome: 75000,
      bpl: true,
      occupation: "landless_laborer",
      landAcres: 0,
      disability: "none",
      household: HH({ hasElderly60Plus: true, lacksLpg: true, isRural: true }),
      documentsHave: ["aadhaar", "ration_bpl"],
    },
  },
  {
    id: "lakshmi",
    name: "Kamla — pregnant, informal worker",
    blurb: "26, pregnant, OBC, poor household in rural Bihar. Has Aadhaar + bank account.",
    freeText:
      "I'm Kamla, 26, expecting my first baby. We're a poor family in Bihar, I do household and farm labour. I have Aadhaar and a bank account. Is there any help for me?",
    profile: {
      name: "Kamla",
      language: "en",
      state: "BIHAR",
      category: "OBC",
      age: 26,
      gender: "female",
      annualHouseholdIncome: 105000,
      bpl: true,
      occupation: "informal",
      disability: "none",
      household: HH({ isPregnantOrLactating: true, lacksLpg: true, isRural: true }),
      documentsHave: ["aadhaar", "bank"],
    },
  },
  {
    id: "imran",
    name: "Rafiq — OBC student, the scholarship trap",
    blurb: "Father of an OBC class-11 student, Rajasthan, income ₹1.75L. Has caste cert but no income certificate.",
    freeText:
      "My son is in class 11, we are OBC, family income about 1.75 lakh a year in Rajasthan. We have Aadhaar, a bank account and a caste certificate, but no income certificate. Can he get a scholarship?",
    profile: {
      name: "Rafiq",
      language: "en",
      state: "RAJASTHAN",
      category: "OBC",
      age: 43,
      gender: "male",
      annualHouseholdIncome: 175000,
      bpl: false,
      occupation: "informal",
      disability: "none",
      household: HH({ hasSchoolGoingChild: true, isRural: false }),
      documentsHave: ["aadhaar", "bank", "caste"],
      docDetails: {
        names: { aadhaar: "Mohammad Rafiq Sheikh", bank: "Md Rafiq" },
        casteIsNCL: "no",
        bankAadhaarSeeded: "unsure",
      },
    },
  },
  {
    id: "govind",
    name: "Bhola — small farmer, no pucca house",
    blurb: "36, small farmer (1.4 acres) in rural Rajasthan, lives in a kachha house. Has Aadhaar, bank, ration card.",
    freeText:
      "Main Bhola hoon, 36 saal, Rajasthan ke gaon mein 1.4 acre zameen hai. Hamara kachha ghar hai. Aadhaar, bank account aur ration card hai. Kaun si yojana mil sakti hai?",
    profile: {
      name: "Bhola",
      language: "en",
      state: "RAJASTHAN",
      category: "OBC",
      age: 36,
      gender: "male",
      annualHouseholdIncome: 135000,
      bpl: true,
      occupation: "small_farmer",
      landAcres: 1.4,
      disability: "none",
      household: HH({ lacksPuccaHouse: true, lacksLpg: true, isRural: true }),
      documentsHave: ["aadhaar", "bank", "ration_bpl"],
      docDetails: { names: {}, bankAadhaarSeeded: "no" },
    },
  },
];
