import { useState } from 'react';
import './SupportedStructures.css';

interface StructureExample {
  category: string;
  examples: string[];
}

const SUPPORTED_STRUCTURES: StructureExample[] = [
  {
    category: 'Quantifiers',
    examples: [
      'for all real numbers x, there exists a real number y such that x < y',
      'for every integer n, n equals n',
      'there exists an integer m such that m > 0',
      'there exists a real number x such that x > 0',
    ],
  },
  {
    category: 'Relations',
    examples: [
      'x is less than y',
      'x is greater than or equal to 5',
      'x equals y',
      'x is not equal to y',
      'x belongs to the real numbers',
    ],
  },
  {
    category: 'Logical Connectives',
    examples: [
      'p and q',
      'p or q',
      'p but q',
      'p unless q',
    ],
  },
  {
    category: 'Implications',
    examples: [
      'if p then q',
      'p only if q',
      'q if p',
      'p implies q',
      'p iff q',
      'p if and only if q',
    ],
  },
  {
    category: 'Necessary and Sufficient Conditions',
    examples: [
      'p is sufficient for q',
      'p is necessary for q',
      'p is necessary and sufficient for q',
      'being a tomato is a sufficient condition for being a fruit',
      'being a fruit is a necessary condition for being a tomato',
    ],
  },
];

function SupportedStructures() {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="supported-structures">
      <button
        type="button"
        className="supported-structures-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="supported-structures-title">Supported English Structures</span>
        <span className="supported-structures-toggle">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div className="supported-structures-content">
          {SUPPORTED_STRUCTURES.map((section, idx) => (
            <div key={idx} className="supported-structures-section">
              <h4 className="supported-structures-category">{section.category}</h4>
              <ul className="supported-structures-list">
                {section.examples.map((example, exIdx) => (
                  <li key={exIdx} className="supported-structures-item">
                    <code className="supported-structures-example">{example}</code>
                    <button
                      type="button"
                      className="supported-structures-copy"
                      onClick={() => handleCopy(example)}
                      title="Copy example"
                      aria-label={`Copy: ${example}`}
                    >
                      Copy
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SupportedStructures;
