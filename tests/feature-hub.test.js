import { describe, expect, it } from 'vitest';

import {
    calculateNutritionTotals,
    scaleFoodSnapshot,
    scaleMealOrRecipe,
    scaleRecipe,
    scaleSavedMeal
} from '../src/feature-hub.js';

function food(overrides = {}) {
    return {
        id: 'food_oats',
        foodId: 'food_oats',
        name: 'Oats',
        calories: 150,
        protein: 5,
        carbs: 27,
        fats: 3,
        servingSize: 40,
        servingUnit: 'g',
        micros: { iron: 1.8, calcium: null },
        otherNutrients: { fiber: 4, totalSugar: 1, addedSugar: null },
        nutrientCoverage: { known: [], unknown: [], ratio: 0 },
        ...overrides
    };
}

describe('scaleFoodSnapshot', () => {
    it('scales macros, nested nutrients, and the serving without mutating its source', () => {
        const source = food();
        const result = scaleFoodSnapshot(source, 1.5);

        expect(result.servingSize).toBe(60);
        expect(result.calories).toBe(225);
        expect(result.protein).toBe(7.5);
        expect(result.micros.iron).toBe(2.7);
        expect(result.otherNutrients.fiber).toBe(6);
        expect(source.servingSize).toBe(40);
        expect(source.calories).toBe(150);
    });

    it('keeps missing nutrients null rather than fabricating zero', () => {
        const result = scaleFoodSnapshot(food(), 2);

        expect(result.micros.calcium).toBeNull();
        expect(result.otherNutrients.addedSugar).toBeNull();
        expect(result.nutrientCoverage.unknown).toContain('calcium');
        expect(result.nutrientCoverage.unknown).toContain('addedSugar');
    });

    it('uses a safe zero factor for invalid negative scaling', () => {
        const result = scaleFoodSnapshot(food(), -4);

        expect(result.calories).toBe(0);
        expect(result.servingSize).toBe(0);
        expect(result.micros.calcium).toBeNull();
    });
});

describe('calculateNutritionTotals', () => {
    it('accounts for each ingredient quantity relative to its snapshot serving', () => {
        const items = [
            { quantity: 80, food: food() },
            { quantity: 20, food: food({ id: 'food_second', calories: 100, servingSize: 20 }) }
        ];
        const result = calculateNutritionTotals(items);

        expect(result.calories).toBe(400);
        expect(result.protein).toBe(15);
        expect(result.otherNutrients.fiber).toBe(12);
    });

    it('reports known subtotals and incomplete coverage', () => {
        const result = calculateNutritionTotals([
            food(),
            food({ id: 'food_unknown', calories: null, protein: null })
        ]);

        expect(result.calories).toBe(150);
        expect(result.coverage.known).toContain('calories');
        expect(result.coverage.incomplete).toContain('calories');
        expect(result.micros.calcium).toBeNull();
        expect(result.coverage.unknown).toContain('calcium');
    });

    it('returns unknown nutrients for an empty collection', () => {
        const result = calculateNutritionTotals([]);

        expect(result.calories).toBeNull();
        expect(result.protein).toBeNull();
        expect(result.coverage.ratio).toBe(0);
    });
});

describe('saved meal and recipe scaling', () => {
    const template = {
        id: 'recipe_breakfast',
        servings: 4,
        ingredients: [
            { id: 'ingredient_oats', quantity: 160, unit: 'g', food: food() },
            { id: 'ingredient_milk', quantity: 200, unit: 'ml', food: food({ id: 'food_milk', calories: 120, protein: 8, servingSize: 200, servingUnit: 'ml' }) }
        ]
    };

    it('returns one requested recipe serving from a multi-serving batch', () => {
        const result = scaleRecipe(template, 1);

        expect(result).toHaveLength(2);
        expect(result[0].servingSize).toBe(40);
        expect(result[0].calories).toBe(150);
        expect(result[1].servingSize).toBe(50);
        expect(result[1].calories).toBe(30);
    });

    it('scales requested servings proportionally', () => {
        const one = scaleMealOrRecipe(template, 1);
        const two = scaleMealOrRecipe(template, 2);

        expect(two[0].calories).toBe(one[0].calories * 2);
        expect(two[1].servingSize).toBe(one[1].servingSize * 2);
    });

    it('supports saved meal items through the explicit alias', () => {
        const savedMeal = { ...template, items: template.ingredients, ingredients: undefined, servings: 2 };
        const result = scaleSavedMeal(savedMeal, 1);

        expect(result[0].servingSize).toBe(80);
        expect(result[0].calories).toBe(300);
    });

    it('does not mutate stored ingredient snapshots', () => {
        const source = structuredClone(template);
        scaleRecipe(source, 3);

        expect(source.ingredients[0].quantity).toBe(160);
        expect(source.ingredients[0].food.calories).toBe(150);
    });
});
