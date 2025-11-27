'use server';
/**
 * @fileOverview A receipt scanning AI agent.
 *
 * - extractReceiptInfo - A function that handles the receipt scanning process.
 * - ExtractReceiptInfoInput - The input type for the extractReceiptInfo function.
 * - ExtractReceiptInfoOutput - The return type for the extractReceiptInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractReceiptInfoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractReceiptInfoInput = z.infer<
  typeof ExtractReceiptInfoInputSchema
>;

const LineItemSchema = z.object({
  quantity: z.number().optional().describe('The quantity of the item. This should always be 1, as you will unroll multi-quantity items.'),
  description: z.string().describe('The description or name of the item.'),
  amount: z.number().describe('The price of a single item.'),
});

const ExtractReceiptInfoOutputSchema = z.object({
  isReceipt: z.boolean().describe('Whether or not the input is a receipt.'),
  total: z.number().optional().describe('The total amount of the receipt.'),
  items: z.array(LineItemSchema).optional().describe('A list of line items from the receipt, each representing a charge.'),
});

export type ExtractReceiptInfoOutput = z.infer<
  typeof ExtractReceiptInfoOutputSchema
>;

export async function extractReceiptInfo(
  input: ExtractReceiptInfoInput
): Promise<ExtractReceiptInfoOutput> {
  return extractReceiptInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractReceiptInfoPrompt',
  input: {schema: ExtractReceiptInfoInputSchema},
  output: {schema: ExtractReceiptInfoOutputSchema},
  prompt: `You are an expert receipt scanner. Analyze the provided image to determine if it is a receipt.
If it is a receipt, extract the line items. IMPORTANT: If a line item has a quantity greater than 1, you must "unroll" it into multiple individual items.
For example, if you see '2 Water Bottles' for a total of '$3.00', you must output two separate items: one for 'Water Bottle' with quantity 1 and amount 1.50, and another for 'Water Bottle' with quantity 1 and amount 1.50.
The quantity for every item in the output should always be 1.
Also extract the total amount of the entire receipt. The total is usually labeled as "Total", "TOTAL", or is the largest number at the bottom of the receipt.
If it is not a receipt or you cannot determine the required information, indicate that. Respond with the extracted information.

Photo: {{media url=photoDataUri}}`,
});

const extractReceiptInfoFlow = ai.defineFlow(
  {
    name: 'extractReceiptInfoFlow',
    inputSchema: ExtractReceiptInfoInputSchema,
    outputSchema: ExtractReceiptInfoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
