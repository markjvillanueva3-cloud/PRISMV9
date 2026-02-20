const PRISM_SORTING = {
    
    /**
     * Quicksort with median-of-three pivot selection
     * @param {Array} arr - Array to sort
     * @param {Function} compare - Optional comparison function
     * @returns {Array} Sorted array
     */
    quickSort: function(arr, compare = (a, b) => a - b) {
        const result = [...arr];
        
        const partition = (low, high) => {
            // Median-of-three pivot
            const mid = Math.floor((low + high) / 2);
            if (compare(result[mid], result[low]) < 0) [result[low], result[mid]] = [result[mid], result[low]];
            if (compare(result[high], result[low]) < 0) [result[low], result[high]] = [result[high], result[low]];
            if (compare(result[mid], result[high]) < 0) [result[mid], result[high]] = [result[high], result[mid]];
            
            const pivot = result[high];
            let i = low - 1;
            
            for (let j = low; j < high; j++) {
                if (compare(result[j], pivot) <= 0) {
                    i++;
                    [result[i], result[j]] = [result[j], result[i]];
                }
            }
            [result[i + 1], result[high]] = [result[high], result[i + 1]];
            return i + 1;
        };
        
        const sort = (low, high) => {
            if (low < high) {
                const pi = partition(low, high);
                sort(low, pi - 1);
                sort(pi + 1, high);
            }
        };
        
        sort(0, result.length - 1);
        return result;
    },
    
    /**
     * Merge sort (stable)
     * @param {Array} arr - Array to sort
     * @param {Function} compare - Optional comparison function
     * @returns {Array} Sorted array
     */
    mergeSort: function(arr, compare = (a, b) => a - b) {
        if (arr.length <= 1) return [...arr];
        
        const merge = (left, right) => {
            const result = [];
            let i = 0, j = 0;
            
            while (i < left.length && j < right.length) {
                if (compare(left[i], right[j]) <= 0) {
                    result.push(left[i++]);
                } else {
                    result.push(right[j++]);
                }
            }
            return result.concat(left.slice(i)).concat(right.slice(j));
        };
        
        const mid = Math.floor(arr.length / 2);
        const left = this.mergeSort(arr.slice(0, mid), compare);
        const right = this.mergeSort(arr.slice(mid), compare);
        
        return merge(left, right);
    },
    
    /**
     * Heap sort
     * @param {Array} arr - Array to sort
     * @param {Function} compare - Optional comparison function
     * @returns {Array} Sorted array
     */
    heapSort: function(arr, compare = (a, b) => a - b) {
        const result = [...arr];
        const n = result.length;
        
        const heapify = (size, i) => {
            let largest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            
            if (left < size && compare(result[left], result[largest]) > 0) {
                largest = left;
            }
            if (right < size && compare(result[right], result[largest]) > 0) {
                largest = right;
            }
            if (largest !== i) {
                [result[i], result[largest]] = [result[largest], result[i]];
                heapify(size, largest);
            }
        };
        
        // Build max heap
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            heapify(n, i);
        }
        
        // Extract elements
        for (let i = n - 1; i > 0; i--) {
            [result[0], result[i]] = [result[i], result[0]];
            heapify(i, 0);
        }
        
        return result;
    }
}