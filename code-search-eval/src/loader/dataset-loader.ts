import { readFile } from 'fs/promises';
import { resolve } from 'path';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { EvaluationDatasetSchema, type EvaluationDataset } from '../types/index.js';

/**
 * Loads and validates evaluation datasets
 */
export class DatasetLoader {
  private ajv: Ajv;
  private validator: ValidateFunction | null = null;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
  }

  /**
   * Load JSON schema for AJV validation
   */
  private async loadSchema(schemaPath: string): Promise<void> {
    try {
      const schemaContent = await readFile(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent);
      this.validator = this.ajv.compile(schema);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load schema from ${schemaPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Load and validate a dataset file
   */
  async load(datasetPath: string, schemaPath?: string): Promise<EvaluationDataset> {
    const resolvedPath = resolve(process.cwd(), datasetPath);

    try {
      // Load dataset file
      const content = await readFile(resolvedPath, 'utf-8');
      const data = JSON.parse(content);

      // Validate with JSON schema using AJV if schema provided
      if (schemaPath) {
        if (!this.validator) {
          await this.loadSchema(schemaPath);
        }
        if (this.validator && !this.validator(data)) {
          const errors = this.validator.errors
            ?.map((e) => `${e.instancePath} ${e.message}`)
            .join(', ');
          throw new Error(`Dataset validation failed: ${errors}`);
        }
      }

      // Validate with Zod schema
      const dataset = EvaluationDatasetSchema.parse(data);

      // Additional validation
      if (dataset.questions.length !== dataset.totalQuestions) {
        throw new Error(
          `Question count mismatch: totalQuestions=${dataset.totalQuestions}, actual=${dataset.questions.length}`
        );
      }

      // Check for duplicate question IDs
      const ids = dataset.questions.map((q) => q.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        throw new Error('Duplicate question IDs found in dataset');
      }

      return dataset;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load dataset from ${resolvedPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate that the repository path exists and is accessible
   */
  async validateRepoPath(repoPath: string): Promise<void> {
    const { access } = await import('fs/promises');
    const { constants } = await import('fs');

    try {
      const resolvedPath = resolve(repoPath);
      await access(resolvedPath, constants.R_OK);
    } catch (error) {
      throw new Error(
        `Repository path is not accessible: ${repoPath}. Please ensure the path exists and you have read permissions.`
      );
    }
  }
}
