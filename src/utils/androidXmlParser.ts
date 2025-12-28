
import { parseStringPromise } from 'xml2js';

export interface AndroidElement {
  id: number;
  resourceId?: string;
  text?: string;
  contentDesc?: string;
  type: string; // class name e.g. android.widget.Button
  bounds: string;
  center: { x: number, y: number };
  interactive: boolean;
}

/**
 * Parses raw UIAutomator XML and returns a simplified list of interactive elements.
 */
export class AndroidXmlParser {
  
  /**
   * Main entry point: Parses XML string -> Simplified JSON
   */
  static async parse(rawXml: string): Promise<AndroidElement[]> {
    try {
      const result = await parseStringPromise(rawXml);
      const elements: AndroidElement[] = [];
      let counter = 1;

      // Recursive function to traverse the node tree
      const traverse = (node: any) => {
        if (!node) return;

        // node is often an object with '$' containing attributes and 'node' being children array
        const attributes = node.$ || {};
        
        // Check if interesting
        if (this.isInteractive(attributes)) {
            const bounds = attributes['bounds'];
            const center = this.parseBounds(bounds);
            
            if (center) {
                elements.push({
                    id: counter++,
                    resourceId: attributes['resource-id'],
                    text: attributes['text'],
                    contentDesc: attributes['content-desc'],
                    type: attributes['class'],
                    bounds: bounds,
                    center: center,
                    interactive: true
                });
            }
        }

        // Recursively check children
        if (node.node) {
            node.node.forEach((child: any) => traverse(child));
        }
      };

      // Start traversal from hierarchy root
      if (result.hierarchy && result.hierarchy.node) {
        result.hierarchy.node.forEach((n: any) => traverse(n));
      }

      return elements;
    } catch (error) {
      console.error("Failed to parse Android XML:", error);
      return [];
    }
  }

  /**
   * Determines if an element is worth showing to the LLM.
   * Focuses on clickable, editable, or informative elements with text.
   */
  private static isInteractive(attrs: any): boolean {
    if (!attrs) return false;

    const isClickable = attrs['clickable'] === 'true';
    const isEditable = attrs['focusable'] === 'true' || attrs['editable'] === 'true';
    const hasText = attrs['text'] && attrs['text'].length > 0;
    const hasDesc = attrs['content-desc'] && attrs['content-desc'].length > 0;

    // Filter out layout containers that aren't explicitly clickable
    // But KEEP text views even if not clickable, so we can "read" the screen
    return isClickable || isEditable || hasText || hasDesc;
  }

  /**
   * Converts "[x1,y1][x2,y2]" string to center {x, y} object
   */
  private static parseBounds(boundsString: string): { x: number, y: number } | null {
    try {
        // Regex to match [123,456][789,012]
        const match = boundsString.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (!match) return null;

        const x1 = parseInt(match[1]);
        const y1 = parseInt(match[2]);
        const x2 = parseInt(match[3]);
        const y2 = parseInt(match[4]);

        return {
            x: Math.floor((x1 + x2) / 2),
            y: Math.floor((y1 + y2) / 2)
        };
    } catch (e) {
        return null;
    }
  }
}
