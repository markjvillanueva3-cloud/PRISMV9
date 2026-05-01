const PRISM_COMPUTATION_ENGINE = {
    // Constants
    constants: {
        PI: Math.PI,
        E: Math.E,
        TAU: 2 * Math.PI,
        PHI: (1 + Math.sqrt(5)) / 2,
        SQRT2: Math.SQRT2,
        LN2: Math.LN2,
        LN10: Math.LN10
    },
    
    // Built-in functions
    functions: {
        // Basic math
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        trunc: Math.trunc,
        sign: Math.sign,
        
        // Powers and roots
        sqrt: Math.sqrt,
        cbrt: Math.cbrt,
        pow: Math.pow,
        exp: Math.exp,
        log: Math.log,
        log10: Math.log10,
        log2: Math.log2,
        
        // Trigonometry
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
        atan2: Math.atan2,
        sinh: Math.sinh,
        cosh: Math.cosh,
        tanh: Math.tanh,
        
        // Conversion
        deg: (rad) => rad * 180 / Math.PI,
        rad: (deg) => deg * Math.PI / 180,
        
        // Aggregates
        min: Math.min,
        max: Math.max,
        sum: (...args) => args.reduce((a, b) => a + b, 0),
        avg: (...args) => args.reduce((a, b) => a + b, 0) / args.length,
        
        // Utilities
        clamp: (x, min, max) => Math.min(Math.max(x, min), max),
        lerp: (a, b, t) => a + (b - a) * t,
        map: (x, inMin, inMax, outMin, outMax) => 
            outMin + (x - inMin) * (outMax - outMin) / (inMax - inMin),
        
        // Conditionals
        if: (cond, thenVal, elseVal) => cond ? thenVal : elseVal
    },
    
    // Tokenize an expression
    tokenize(expression) {
        const tokens = [];
        let i = 0;
        
        while (i < expression.length) {
            const char = expression[i];
            
            // Skip whitespace
            if (/\s/.test(char)) {
                i++;
                continue;
            }
            
            // Number
            if (/[0-9.]/.test(char)) {
                let num = '';
                while (i < expression.length && /[0-9.eE+-]/.test(expression[i])) {
                    num += expression[i++];
                }
                tokens.push({ type: 'number', value: parseFloat(num) });
                continue;
            }
            
            // Identifier (variable or function)
            if (/[a-zA-Z_]/.test(char)) {
                let name = '';
                while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
                    name += expression[i++];
                }
                tokens.push({ type: 'identifier', value: name });
                continue;
            }
            
            // Operators
            if ('+-*/^%'.includes(char)) {
                tokens.push({ type: 'operator', value: char });
                i++;
                continue;
            }
            
            // Comparison operators
            if ('<>=!'.includes(char)) {
                let op = char;
                if (expression[i + 1] === '=') {
                    op += '=';
                    i++;
                }
                tokens.push({ type: 'comparison', value: op });
                i++;
                continue;
            }
            
            // Parentheses and comma
            if ('(),'.includes(char)) {
                tokens.push({ type: char === ',' ? 'comma' : 'paren', value: char });
                i++;
                continue;
            }
            
            throw new Error(`Unexpected character: ${char}`);
        }
        
        return tokens;
    },
    
    // Parse tokens to AST
    parse(tokens) {
        let pos = 0;
        
        const peek = () => tokens[pos];
        const consume = () => tokens[pos++];
        
        const parseExpression = () => parseComparison();
        
        const parseComparison = () => {
            let left = parseAdditive();
            
            while (peek() && peek().type === 'comparison') {
                const op = consume().value;
                const right = parseAdditive();
                left = { type: 'comparison', operator: op, left, right };
            }
            
            return left;
        };
        
        const parseAdditive = () => {
            let left = parseMultiplicative();
            
            while (peek() && peek().type === 'operator' && '+-'.includes(peek().value)) {
                const op = consume().value;
                const right = parseMultiplicative();
                left = { type: 'binary', operator: op, left, right };
            }
            
            return left;
        };
        
        const parseMultiplicative = () => {
            let left = parsePower();
            
            while (peek() && peek().type === 'operator' && '*/%'.includes(peek().value)) {
                const op = consume().value;
                const right = parsePower();
                left = { type: 'binary', operator: op, left, right };
            }
            
            return left;
        };
        
        const parsePower = () => {
            let left = parseUnary();
            
            while (peek() && peek().type === 'operator' && peek().value === '^') {
                consume();
                const right = parseUnary();
                left = { type: 'binary', operator: '^', left, right };
            }
            
            return left;
        };
        
        const parseUnary = () => {
            if (peek() && peek().type === 'operator' && '+-'.includes(peek().value)) {
                const op = consume().value;
                const operand = parseUnary();
                return { type: 'unary', operator: op, operand };
            }
            
            return parsePrimary();
        };
        
        const parsePrimary = () => {
            const token = peek();
            
            if (!token) {
                throw new Error('Unexpected end of expression');
            }
            
            // Number
            if (token.type === 'number') {
                consume();
                return { type: 'number', value: token.value };
            }
            
            // Identifier (variable or function)
            if (token.type === 'identifier') {
                consume();
                
                // Check for function call
                if (peek() && peek().value === '(') {
                    consume(); // (
                    const args = [];
                    
                    if (peek() && peek().value !== ')') {
                        args.push(parseExpression());
                        
                        while (peek() && peek().type === 'comma') {
                            consume(); // ,
                            args.push(parseExpression());
                        }
                    }
                    
                    if (!peek() || peek().value !== ')') {
                        throw new Error('Expected closing parenthesis');
                    }
                    consume(); // )
                    
                    return { type: 'function', name: token.value, args };
                }
                
                return { type: 'variable', name: token.value };
            }
            
            // Parenthesized expression
            if (token.value === '(') {
                consume(); // (
                const expr = parseExpression();
                
                if (!peek() || peek().value !== ')') {
                    throw new Error('Expected closing parenthesis');
                }
                consume(); // )
                
                return expr;
            }
            
            throw new Error(`Unexpected token: ${token.value}`);
        };
        
        return parseExpression();
    },
    
    // Evaluate an AST
    evaluate(ast, variables = {}) {
        const allVars = { ...this.constants, ...variables };
        
        const evalNode = (node) => {
            switch (node.type) {
                case 'number':
                    return node.value;
                
                case 'variable':
                    if (node.name in allVars) {
                        return allVars[node.name];
                    }
                    throw new Error(`Unknown variable: ${node.name}`);
                
                case 'function':
                    const fn = this.functions[node.name];
                    if (!fn) {
                        throw new Error(`Unknown function: ${node.name}`);
                    }
                    const args = node.args.map(evalNode);
                    return fn(...args);
                
                case 'unary':
                    const operand = evalNode(node.operand);
                    return node.operator === '-' ? -operand : operand;
                
                case 'binary':
                    const left = evalNode(node.left);
                    const right = evalNode(node.right);
                    
                    switch (node.operator) {
                        case '+': return left + right;
                        case '-': return left - right;
                        case '*': return left * right;
                        case '/': return left / right;
                        case '%': return left % right;
                        case '^': return Math.pow(left, right);
                    }
                    break;
                
                case 'comparison':
                    const l = evalNode(node.left);
                    const r = evalNode(node.right);
                    
                    switch (node.operator) {
                        case '<': return l < r ? 1 : 0;
                        case '<=': return l <= r ? 1 : 0;
                        case '>': return l > r ? 1 : 0;
                        case '>=': return l >= r ? 1 : 0;
                        case '==': return l === r ? 1 : 0;
                        case '!=': return l !== r ? 1 : 0;
                    }
                    break;
            }
            
            throw new Error(`Unknown node type: ${node.type}`);
        };
        
        return evalNode(ast);
    },
    
    // Compile expression to function
    compile(expression) {
        const tokens = this.tokenize(expression);
        const ast = this.parse(tokens);
        
        // Extract variable names
        const variables = new Set();
        const extractVars = (node) => {
            if (node.type === 'variable' && !(node.name in this.constants)) {
                variables.add(node.name);
            }
            if (node.left) extractVars(node.left);
            if (node.right) extractVars(node.right);
            if (node.operand) extractVars(node.operand);
            if (node.args) node.args.forEach(extractVars);
        };
        extractVars(ast);
        
        return {
            ast,
            variables: Array.from(variables),
            evaluate: (vars = {}) => this.evaluate(ast, vars)
        };
    },
    
    // Simple expression evaluation
    eval(expression, variables = {}) {
        const tokens = this.tokenize(expression);
        const ast = this.parse(tokens);
        return this.evaluate(ast, variables);
    },
    
    // Register a custom function
    registerFunction(name, fn) {
        this.functions[name] = fn;
    },
    
    // Register a custom constant
    registerConstant(name, value) {
        this.constants[name] = value;
    }
}