import OpenAI from 'openai';

/**
 * Use LLM as a judge to score semantic quality of answers
 */
export class LLMJudge {
  private openai: OpenAI;
  private model: string;
  private temperature: number;

  constructor(apiKey: string, model: string = 'gpt-4o-mini', temperature: number = 0.1) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
    this.temperature = temperature;
  }

  /**
   * Score the semantic quality of an answer
   * Returns a score between 0 and 1
   */
  async scoreAnswer(
    question: string,
    actualAnswer: string,
    expectedAnswer: string
  ): Promise<number> {
    const prompt = `You are evaluating the quality of an AI agent's answer to a code-related question.

Question:
${question}

Expected Answer (Reference):
${expectedAnswer}

Actual Answer (To Evaluate):
${actualAnswer}

Evaluate the actual answer on these criteria:
1. **Accuracy**: Does it correctly answer the question?
2. **Completeness**: Does it cover the key points from the expected answer?
3. **Relevance**: Does it stay focused on the question?
4. **Clarity**: Is it well-explained and understandable?

Scoring Guidelines:
- 0.9-1.0: Excellent - Accurate, complete, and well-explained
- 0.7-0.89: Good - Mostly accurate with minor gaps
- 0.5-0.69: Fair - Partially correct but missing key information
- 0.3-0.49: Poor - Significant inaccuracies or gaps
- 0.0-0.29: Very Poor - Mostly incorrect or irrelevant

Return ONLY a decimal number between 0 and 1 (e.g., 0.85).
Do not include any explanation, just the number.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert evaluator. Return only a single decimal number between 0 and 1.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: this.temperature,
        max_tokens: 10,
      });

      const content = response.choices[0]?.message?.content?.trim() || '0';

      // Parse score
      const score = parseFloat(content);

      // Validate score is in range
      if (isNaN(score) || score < 0 || score > 1) {
        console.warn(`Invalid LLM judge score: ${content}, defaulting to 0`);
        return 0;
      }

      return score;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to score answer with LLM judge: ${error.message}`);
      }
      return 0;
    }
  }

  /**
   * Score with detailed feedback (for debugging/analysis)
   */
  async scoreWithFeedback(
    question: string,
    actualAnswer: string,
    expectedAnswer: string
  ): Promise<{
    score: number;
    feedback: string;
  }> {
    const prompt = `You are evaluating the quality of an AI agent's answer to a code-related question.

Question:
${question}

Expected Answer (Reference):
${expectedAnswer}

Actual Answer (To Evaluate):
${actualAnswer}

Evaluate the actual answer and provide:
1. A score between 0 and 1
2. Brief feedback explaining the score

Format your response as JSON:
{
  "score": 0.85,
  "feedback": "The answer is accurate and covers most key points..."
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert evaluator. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: this.temperature,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content?.trim() || '{}';

      try {
        const result = JSON.parse(content);
        const score = parseFloat(result.score);

        if (isNaN(score) || score < 0 || score > 1) {
          return { score: 0, feedback: 'Invalid score from LLM' };
        }

        return {
          score,
          feedback: result.feedback || 'No feedback provided',
        };
      } catch (parseError) {
        console.warn('Failed to parse LLM judge feedback response');
        return { score: 0, feedback: 'Failed to parse response' };
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to get LLM judge feedback: ${error.message}`);
      }
      return { score: 0, feedback: 'Error during evaluation' };
    }
  }
}
