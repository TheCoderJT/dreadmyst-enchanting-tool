"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// Import the affixes array directly
import affixesData from "../../scripts/affixes_array.json";

export default function AdminSeedAffixes() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const seedAffixes = useMutation(api.validation.seedAffixesPublic);
  const allAffixes = useQuery(api.validation.getAllAffixes);
  
  const handleSeed = async () => {
    setIsSeeding(true);
    setResult(null);
    
    try {
      const res = await seedAffixes({ affixes: affixesData as string[] });
      setResult(`Successfully seeded ${res.inserted} unique affixes!`);
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsSeeding(false);
    }
  };
  
  return (
    <div style={{ padding: "1rem", background: "#1a1a2e", borderRadius: "8px", marginTop: "1rem" }}>
      <h3 style={{ color: "#fff", marginBottom: "1rem" }}>Admin: Seed Affixes Database</h3>
      
      <p style={{ color: "#888", marginBottom: "1rem" }}>
        Current affixes in database: {allAffixes?.length ?? "Loading..."}
      </p>
      
      <button
        onClick={handleSeed}
        disabled={isSeeding}
        style={{
          padding: "0.5rem 1rem",
          background: isSeeding ? "#444" : "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: isSeeding ? "not-allowed" : "pointer",
        }}
      >
        {isSeeding ? "Seeding..." : "Seed Affixes from JSON"}
      </button>
      
      {result && (
        <p style={{ 
          marginTop: "1rem", 
          color: result.startsWith("Error") ? "#ef4444" : "#22c55e" 
        }}>
          {result}
        </p>
      )}
    </div>
  );
}
