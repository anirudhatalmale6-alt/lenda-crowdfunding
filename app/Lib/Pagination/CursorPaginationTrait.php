<?php
/**
 * Cursor-based Pagination Trait
 * 
 * Provides cursor-based pagination for efficient database querying.
 * This is more efficient than offset-based pagination for large datasets
 * and provides consistent results when data changes between pages.
 * 
 * Usage:
 * In your controller, use this trait and call:
 *   $this->paginateWithCursor($model, $cursor, $limit, $conditions, $order);
 */

App::uses('ConnectionManager', 'Core');

trait CursorPaginationTrait {
    
    /**
     * Default cursor size
     */
    const DEFAULT_CURSOR_LIMIT = 20;
    const MAX_CURSOR_LIMIT = 100;
    
    /**
     * Paginate using cursor-based navigation
     * 
     * @param Model $model The model to query
     * @param string|null $cursor The cursor (encoded last ID from previous page)
     * @param int $limit Number of items per page
     * @param array $conditions Query conditions
     * @param array $order Order clause
     * @param array $contain Related models to fetch (for eager loading)
     * @return array Results with pagination metadata
     */
    protected function paginateWithCursor($model, $cursor = null, $limit = self::DEFAULT_CURSOR_LIMIT, 
        $conditions = array(), $order = array('id' => 'DESC'), $contain = array()) {
        
        $limit = min(max(1, intval($limit)), self::MAX_CURSOR_LIMIT);
        
        // Decode cursor if provided
        $lastId = null;
        if ($cursor) {
            $lastId = $this->_decodeCursor($cursor);
        }
        
        // Add cursor condition if provided
        if ($lastId) {
            $cursorField = key($order);
            $cursorDirection = strtoupper(reset($order)) === 'DESC' ? '<' : '>';
            $conditions[$model->alias . '.' . $cursorField . ' ' . $cursorDirection] = $lastId;
        }
        
        // Ensure consistent ordering with ID as tiebreaker
        if (!isset($order[$model->alias . '.id'])) {
            $order[$model->alias . '.id'] = isset($order[key($order)]) ? reset($order) : 'DESC';
        }
        
        // Execute query with eager loading to avoid N+1
        $results = $model->find('all', array(
            'conditions' => $conditions,
            'order' => $order,
            'limit' => $limit + 1, // Fetch one extra to determine if there are more
            'contain' => $contain
        ));
        
        // Determine if there are more results
        $hasMore = count($results) > $limit;
        if ($hasMore) {
            array_pop($results); // Remove the extra item
        }
        
        // Generate next cursor
        $nextCursor = null;
        if ($hasMore && !empty($results)) {
            $lastItem = end($results);
            $lastItemId = $lastItem[$model->alias]['id'];
            $nextCursor = $this->_encodeCursor($lastItemId);
        }
        
        return array(
            'data' => $results,
            'pagination' => array(
                'cursor' => $nextCursor,
                'has_more' => $hasMore,
                'limit' => $limit
            )
        );
    }
    
    /**
     * Encode cursor from ID
     * 
     * @param int $id The last ID from the results
     * @return string Encoded cursor
     */
    protected function _encodeCursor($id) {
        return base64_encode(json_encode(array(
            'id' => intval($id),
            'ts' => time()
        )));
    }
    
    /**
     * Decode cursor to ID
     * 
     * @param string $cursor The cursor string
     * @return int|null The ID or null if invalid
     */
    protected function _decodeCursor($cursor) {
        try {
            $decoded = json_decode(base64_decode($cursor), true);
            if (isset($decoded['id'])) {
                return intval($decoded['id']);
            }
        } catch (Exception $e) {
            // Invalid cursor
        }
        return null;
    }
    
    /**
     * Generate paginated response with cursor
     * 
     * @param array $results The data results
     * @param string|null $cursor The cursor for next page
     * @param bool $hasMore Whether there are more results
     * @param int $limit Items per page
     * @return array Formatted response
     */
    protected function _cursorPaginatedResponse($results, $cursor, $hasMore, $limit) {
        return array(
            'success' => true,
            'data' => $results,
            'pagination' => array(
                'next_cursor' => $cursor,
                'has_more' => $hasMore,
                'limit' => $limit
            )
        );
    }
}
