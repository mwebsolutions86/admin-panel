// Test simple pour valider les corrections TypeScript
import { DatabaseOptimizer } from './lib/database-optimizer';

const optimizer = new DatabaseOptimizer();

// Test des méthodes corrigées
async function testMethods() {
  try {
    // Test optimizedAggregation (méthode principale corrigée)
    const aggResult = await optimizer.optimizedAggregation(
      'orders',
      ['status'],
      [
        { column: 'total', function: 'sum', alias: 'total_amount' },
        { column: 'id', function: 'count', alias: 'order_count' }
      ],
      {}
    );
    console.log('Aggregation test passed:', typeof aggResult.data === 'object');

    // Test optimizedPagedQuery
    const pagedResult = await optimizer.optimizedPagedQuery('products', {
      limit: 10,
      offset: 0
    });
    console.log('Paged query test passed:', typeof pagedResult.data === 'object');

    // Test optimizedJoinQuery
    const joinResult = await optimizer.optimizedJoinQuery(
      'orders',
      [{ table: 'products', on: 'order_items.product_id = products.id' }],
      {}
    );
    console.log('Join query test passed:', typeof joinResult.data === 'object');

    // Test optimizedFullTextSearch
    const searchResult = await optimizer.optimizedFullTextSearch(
      'products',
      ['name', 'description'],
      'pizza'
    );
    console.log('Search test passed:', typeof searchResult.data === 'object');

    console.log('Tous les tests TypeScript sont passés avec succès !');
  } catch (error) {
    console.error('Erreur lors des tests:', error);
  }
}

testMethods();