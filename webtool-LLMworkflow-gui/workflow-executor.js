// Workflow Executor Module
// Handles workflow execution, topological sorting, and node processing

class WorkflowExecutor {
    constructor(workflowEditor) {
        this.editor = workflowEditor;
    }

    topologicalSort() {
        const nodes = [...this.editor.workflow.nodes];
        const connections = [...this.editor.workflow.connections];
        const sorted = [];
        const visiting = new Set();
        const visited = new Set();
        
        const visit = (nodeId) => {
            if (visiting.has(nodeId)) {
                throw new Error(`Circular dependency detected involving node ${nodeId}`);
            }
            if (visited.has(nodeId)) {
                return;
            }
            
            visiting.add(nodeId);
            
            // Find all nodes that this node depends on (incoming connections)
            const incomingConnections = connections.filter(conn => conn.to === nodeId);
            for (const conn of incomingConnections) {
                visit(conn.from);
            }
            
            visiting.delete(nodeId);
            visited.add(nodeId);
            
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                sorted.push(node);
            }
        };
        
        // Visit all nodes
        for (const node of nodes) {
            if (!visited.has(node.id)) {
                visit(node.id);
            }
        }
        
        return sorted;
    }
    
    async executeWorkflow() {
        if (this.editor.isExecuting) {
            alert('Workflow is already executing');
            return;
        }
        
        if (this.editor.workflow.nodes.length === 0) {
            alert('No nodes to execute');
            return;
        }
        
        try {
            this.editor.isExecuting = true;
            this.editor.updateUI();
            
            // Sort nodes in execution order
            const sortedNodes = this.topologicalSort();
            const results = {};
            
            // Execute nodes in order
            for (const node of sortedNodes) {
                const result = await this.executeNode(node, results);
                results[node.id] = result;
            }
            
            this.editor.executionResults = results;
            
            alert('Workflow executed successfully! Check console for results.');
            
        } catch (error) {
            
            alert('Workflow execution failed: ' + error.message);
        } finally {
            this.editor.isExecuting = false;
            this.editor.updateUI();
        }
    }
    
    async executeNode(node, previousResults) {
        try {
            switch (node.type) {
                case 'input':
                    return await this.executeInputNode(node);
                    
                case 'llm':
                    return await this.executeLLMNode(node, previousResults);
                    
                case 'branch':
                    return await this.executeBranchNode(node, previousResults);
                    
                case 'merge':
                    return await this.executeMergeNode(node, previousResults);
                    
                case 'filter':
                    return await this.executeFilterNode(node, previousResults);
                    
                case 'loop':
                    return await this.executeLoopNode(node, previousResults);
                    
                case 'custom':
                    return await this.executeCustomNode(node, previousResults);
                    
                case 'output':
                    return await this.executeOutputNode(node, previousResults);
                    
                default:
                    throw new Error(`Unknown node type: ${node.type}`);
            }
        } catch (error) {
            throw new Error(`Node ${node.id} (${node.type}) execution failed: ${error.message}`);
        }
    }
    
    async executeInputNode(node) {
        // For input nodes, return the default value or prompt user
        const value = node.data.defaultValue || prompt(`Enter value for ${node.data.label || 'Input'}:`) || '';
        return { data: value, type: 'text' };
    }
    
    async executeLLMNode(node, previousResults) {
        // Get input from connected nodes
        const inputConnections = this.editor.workflow.connections.filter(conn => conn.to === node.id);
        let inputData = '';
        
        if (inputConnections.length > 0) {
            const inputResults = inputConnections.map(conn => previousResults[conn.from]);
            inputData = inputResults.map(result => result?.data || '').join('\n');
        }
        
        try {
            if (typeof callLLMAPI !== 'undefined') {
                const messages = [
                    {
                        role: 'system',
                        content: node.data.systemPrompt || 'You are a helpful assistant.'
                    },
                    {
                        role: 'user',
                        content: (node.data.userPrompt || '{{input}}').replace('{{input}}', inputData)
                    }
                ];
                
                const options = {
                    model: node.data.model || 'gpt-3.5-turbo',
                    temperature: node.data.temperature || 0.7,
                    maxTokens: node.data.maxTokens || 2000
                };
                
                
                const startTime = Date.now();
                const response = await callLLMAPI(messages, options);
                const endTime = Date.now();
                
                return {
                    data: response.choices?.[0]?.message?.content || response.content || 'No response',
                    type: 'text',
                    metadata: {
                        model: options.model,
                        duration: endTime - startTime,
                        tokens: response.usage?.total_tokens || 0
                    }
                };
            } else {
                throw new Error('LLM API not available');
            }
        } catch (error) {
            
            
            // エラー詳細をフォーマット
            const errorDetails = {
                message: error.message,
                node: node.id,
                timestamp: new Date().toISOString(),
                input: inputData.substring(0, 100) + (inputData.length > 100 ? '...' : '')
            };
            
            throw new Error(`LLM API call failed: ${error.message}`);
        }
    }
    
    async executeBranchNode(node, previousResults) {
        // Get input from connected nodes
        const inputConnections = this.editor.workflow.connections.filter(conn => conn.to === node.id);
        let inputData = '';
        
        if (inputConnections.length > 0) {
            const inputResults = inputConnections.map(conn => previousResults[conn.from]);
            inputData = inputResults.map(result => result?.data || '').join('\n');
        }
        
        const condition = node.data.condition || 'contains';
        const value = node.data.value || '';
        const caseSensitive = node.data.caseSensitive || false;
        
        let testData = inputData;
        let testValue = value;
        
        if (!caseSensitive) {
            testData = testData.toLowerCase();
            testValue = testValue.toLowerCase();
        }
        
        let matches = false;
        
        switch (condition) {
            case 'contains':
                matches = testData.includes(testValue);
                break;
            case 'equals':
                matches = testData === testValue;
                break;
            case 'startsWith':
                matches = testData.startsWith(testValue);
                break;
            case 'endsWith':
                matches = testData.endsWith(testValue);
                break;
            case 'regex':
                try {
                    const regex = new RegExp(value, caseSensitive ? '' : 'i');
                    matches = regex.test(inputData);
                } catch (regexError) {
                    throw new Error(`Invalid regex pattern: ${value}`);
                }
                break;
        }
        
        return {
            data: inputData,
            type: 'text',
            branch: matches ? 'true' : 'false',
            metadata: { condition, value, matches }
        };
    }
    
    async executeMergeNode(node, previousResults) {
        // Get input from all connected nodes
        const inputConnections = this.editor.workflow.connections.filter(conn => conn.to === node.id);
        const inputResults = inputConnections.map(conn => previousResults[conn.from]);
        
        const mergeType = node.data.mergeType || 'concat';
        const separator = node.data.separator || '\n';
        
        let mergedData;
        
        switch (mergeType) {
            case 'concat':
                mergedData = inputResults.map(result => result?.data || '').join(separator);
                break;
            case 'array':
                mergedData = JSON.stringify(inputResults.map(result => result?.data || ''));
                break;
            case 'object':
                const obj = {};
                inputResults.forEach((result, index) => {
                    obj[`input_${index}`] = result?.data || '';
                });
                mergedData = JSON.stringify(obj);
                break;
            default:
                mergedData = inputResults.map(result => result?.data || '').join(separator);
        }
        
        return {
            data: mergedData,
            type: mergeType === 'array' || mergeType === 'object' ? 'json' : 'text',
            metadata: { mergeType, inputCount: inputResults.length }
        };
    }
    
    async executeFilterNode(node, previousResults) {
        // Get input from connected nodes
        const inputConnections = this.editor.workflow.connections.filter(conn => conn.to === node.id);
        let inputData = '';
        
        if (inputConnections.length > 0) {
            const inputResults = inputConnections.map(conn => previousResults[conn.from]);
            inputData = inputResults.map(result => result?.data || '').join('\n');
        }
        
        const filterType = node.data.filterType || 'contains';
        const filterValue = node.data.filterValue || '';
        const caseSensitive = node.data.caseSensitive || false;
        
        let filteredData = inputData;
        let passes = true;
        
        switch (filterType) {
            case 'contains':
                passes = caseSensitive ? 
                    inputData.includes(filterValue) : 
                    inputData.toLowerCase().includes(filterValue.toLowerCase());
                break;
            case 'excludes':
                passes = caseSensitive ? 
                    !inputData.includes(filterValue) : 
                    !inputData.toLowerCase().includes(filterValue.toLowerCase());
                break;
            case 'length':
                const targetLength = parseInt(filterValue);
                passes = inputData.length >= targetLength;
                break;
            case 'regex':
                try {
                    const regex = new RegExp(filterValue, caseSensitive ? '' : 'i');
                    passes = regex.test(inputData);
                } catch (regexError) {
                    throw new Error(`Invalid regex pattern: ${filterValue}`);
                }
                break;
        }
        
        return {
            data: passes ? filteredData : '',
            type: 'text',
            filtered: !passes,
            metadata: { filterType, filterValue, passes }
        };
    }
    
    async executeLoopNode(node, previousResults) {
        // Get input from connected nodes
        const inputConnections = this.editor.workflow.connections.filter(conn => conn.to === node.id);
        let inputData = '';
        
        if (inputConnections.length > 0) {
            const inputResults = inputConnections.map(conn => previousResults[conn.from]);
            inputData = inputResults.map(result => result?.data || '').join('\n');
        }
        
        const loopType = node.data.loopType || 'forEach';
        const maxIterations = node.data.maxIterations || 10;
        
        // For now, just return the input (loop execution would need more complex workflow handling)
        return {
            data: inputData,
            type: 'text',
            metadata: { loopType, maxIterations, note: 'Loop execution not fully implemented' }
        };
    }
    
    async executeCustomNode(node, previousResults) {
        // Get input from connected nodes
        const inputConnections = this.editor.workflow.connections.filter(conn => conn.to === node.id);
        let inputData = '';
        
        if (inputConnections.length > 0) {
            const inputResults = inputConnections.map(conn => previousResults[conn.from]);
            inputData = inputResults.map(result => result?.data || '').join('\n');
        }
        
        const customCode = node.data.customCode || 'return input;';
        
        try {
            // Create a safe execution context
            const executeCustomCode = new Function('input', 'Math', 'String', 'Array', customCode);
            const result = executeCustomCode(inputData, Math, String, Array);
            
            return {
                data: result,
                type: typeof result === 'object' ? 'json' : 'text',
                metadata: { customCode: customCode.substring(0, 50) + '...' }
            };
        } catch (error) {
            throw new Error(`Custom code execution failed: ${error.message}`);
        }
    }
    
    async executeOutputNode(node, previousResults) {
        // Get input from connected nodes
        const inputConnections = this.editor.workflow.connections.filter(conn => conn.to === node.id);
        let inputData = '';
        
        if (inputConnections.length > 0) {
            const inputResults = inputConnections.map(conn => previousResults[conn.from]);
            inputData = inputResults.map(result => result?.data || '').join('\n');
        }
        
        const outputFormat = node.data.outputFormat || 'text';
        const destination = node.data.destination || 'console';
        
        // Output the data (for now just log to console)
        console.group(`Output from ${node.data.label || node.id}`);
        console.log('Data:', inputData);
        console.log('Format:', outputFormat);
        console.log('Destination:', destination);
        console.groupEnd();
        
        return {
            data: inputData,
            type: outputFormat,
            output: true,
            metadata: { destination }
        };
    }

    async testAPIConnection() {
        if (!this.editor.selectedNode || this.editor.selectedNode.type !== 'llm') {
            alert('LLMノードを選択してください');
            return;
        }
        
        const button = document.getElementById('test-api-btn');
        const resultDiv = document.getElementById('api-test-result');
        
        if (!button || !resultDiv) return;
        
        try {
            button.disabled = true;
            button.textContent = 'Testing...';
            resultDiv.innerHTML = '<div class="text-blue-600">🔄 Testing API connection...</div>';
            
            
            
            // テスト用のメッセージを作成
            const testMessages = [
                {
                    role: 'system',
                    content: 'You are a helpful assistant. Please respond with a simple greeting.'
                },
                {
                    role: 'user',
                    content: 'Hello! This is a connection test.'
                }
            ];
            
            const testOptions = {
                model: this.editor.selectedNode.data.model || 'gpt-3.5-turbo',
                temperature: 0.7,
                maxTokens: 50
            };
            
            const startTime = Date.now();
            const response = await callLLMAPI(testMessages, testOptions);
            const duration = Date.now() - startTime;
            
            
            
            // 成功メッセージを表示
            resultDiv.innerHTML = `
                <div class="text-green-600 space-y-1">
                    <div>✅ API connection successful!</div>
                    <div class="text-xs">Response time: ${duration}ms</div>
                    <div class="text-xs">Model: ${testOptions.model}</div>
                    <div class="text-xs mt-2 p-2 bg-green-50 rounded text-green-800">
                        Response: "${(response.choices?.[0]?.message?.content || response.content || 'No response').substring(0, 100)}..."
                    </div>
                </div>
            `;
            
            button.textContent = '✅ Test Successful';
            button.style.backgroundColor = '#22c55e';
            
        } catch (error) {
            
            
            // エラー状態のボタン表示
            resultDiv.innerHTML = `
                <div class="text-red-600 space-y-1">
                    <div>❌ API connection failed</div>
                    <div class="text-xs">Error: ${error.message}</div>
                    <div class="text-xs mt-2 p-2 bg-red-50 rounded text-red-800">
                        Please check your API configuration and try again.
                    </div>
                </div>
            `;
            
            button.textContent = '❌ Test Failed';
            button.style.backgroundColor = '#ef4444';
        } finally {
            button.disabled = false;
            
            // Reset button after 3 seconds
            setTimeout(() => {
                button.textContent = 'Test API Connection';
                button.style.backgroundColor = '';
            }, 3000);
        }
    }
}

// Export for use in main workflow editor
window.WorkflowExecutor = WorkflowExecutor; 