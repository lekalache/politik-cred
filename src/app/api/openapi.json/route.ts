import { NextResponse } from 'next/server'

export async function GET() {
    const spec = {
        openapi: '3.0.0',
        info: {
            title: 'Politik Cred\' API',
            version: '1.0.0',
            description: 'API for auditing politicians, collecting data, and tracking promises.'
        },
        servers: [
            {
                url: 'https://politik-cred.netlify.app',
                description: 'Production server'
            },
            {
                url: 'http://localhost:3000',
                description: 'Local development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'API Key'
                }
            },
            schemas: {
                Politician: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        party: { type: 'string' },
                        position: { type: 'string' },
                        credibility_score: { type: 'number' },
                        is_active: { type: 'boolean' }
                    }
                },
                Promise: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        politician_id: { type: 'string', format: 'uuid' },
                        promise_text: { type: 'string' },
                        promise_date: { type: 'string', format: 'date-time' },
                        category: { type: 'string' },
                        confidence_score: { type: 'number' },
                        verification_status: { type: 'string' }
                    }
                },
                ConsistencyScores: {
                    type: 'object',
                    properties: {
                        politicianId: { type: 'string', format: 'uuid' },
                        overallScore: { type: 'number' },
                        promisesKept: { type: 'integer' },
                        promisesBroken: { type: 'integer' },
                        promisesPartial: { type: 'integer' },
                        promisesPending: { type: 'integer' },
                        lastCalculatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                AuditResult: {
                    type: 'object',
                    properties: {
                        politicianId: { type: 'string', format: 'uuid' },
                        politicianName: { type: 'string' },
                        timeframe: { type: 'string' },
                        steps: {
                            type: 'object',
                            properties: {
                                newsSearch: {
                                    type: 'object',
                                    properties: {
                                        articlesFound: { type: 'integer' }
                                    }
                                },
                                promiseExtraction: {
                                    type: 'object',
                                    properties: {
                                        extracted: { type: 'integer' },
                                        stored: { type: 'integer' }
                                    }
                                },
                                scoreCalculation: {
                                    type: 'object',
                                    properties: {
                                        overallScore: { type: 'number' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
        paths: {
            '/api/v1/public/politicians': {
                get: {
                    operationId: 'listPoliticians',
                    summary: 'List politicians',
                    description: 'Retrieve a list of politicians with filtering and pagination.',
                    parameters: [
                        {
                            name: 'page',
                            in: 'query',
                            schema: { type: 'integer', default: 1 }
                        },
                        {
                            name: 'limit',
                            in: 'query',
                            schema: { type: 'integer', default: 20 }
                        },
                        {
                            name: 'search',
                            in: 'query',
                            schema: { type: 'string' },
                            description: 'Search by name'
                        },
                        {
                            name: 'party',
                            in: 'query',
                            schema: { type: 'string' }
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Successful response',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Politician' }
                                            },
                                            pagination: {
                                                type: 'object',
                                                properties: {
                                                    total: { type: 'integer' },
                                                    page: { type: 'integer' },
                                                    total_pages: { type: 'integer' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/public/politicians/{id}': {
                get: {
                    operationId: 'getPolitician',
                    summary: 'Get politician details',
                    description: 'Retrieve detailed information about a specific politician.',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' }
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Successful response',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/Politician' }
                                        }
                                    }
                                }
                            }
                        },
                        '404': {
                            description: 'Politician not found'
                        }
                    }
                }
            },
            '/api/v1/public/politicians/{id}/scores': {
                get: {
                    operationId: 'getPoliticianScores',
                    summary: 'Get politician scores',
                    description: 'Retrieve consistency scores and metrics for a politician.',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' }
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Successful response',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/ConsistencyScores' }
                                        }
                                    }
                                }
                            }
                        },
                        '404': {
                            description: 'Scores not found'
                        }
                    }
                }
            },
            '/api/v1/public/promises': {
                get: {
                    operationId: 'listPromises',
                    summary: 'List promises',
                    description: 'Retrieve a list of political promises with filtering.',
                    parameters: [
                        {
                            name: 'politicianId',
                            in: 'query',
                            schema: { type: 'string', format: 'uuid' }
                        },
                        {
                            name: 'page',
                            in: 'query',
                            schema: { type: 'integer', default: 1 }
                        },
                        {
                            name: 'limit',
                            in: 'query',
                            schema: { type: 'integer', default: 20 }
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Successful response',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Promise' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    operationId: 'extractPromises',
                    summary: 'Extract promises',
                    description: 'Extract political promises from text or URL.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['politicianId', 'text', 'sourceUrl'],
                                    properties: {
                                        politicianId: { type: 'string', format: 'uuid' },
                                        text: { type: 'string' },
                                        sourceUrl: { type: 'string', format: 'uri' },
                                        sourceType: { type: 'string' },
                                        date: { type: 'string', format: 'date-time' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Promises extracted successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            extracted: { type: 'integer' },
                                            stored: { type: 'integer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/news/collect': {
                post: {
                    operationId: 'collectNews',
                    summary: 'Collect news',
                    description: 'Trigger news collection from external sources.',
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        searchText: { type: 'string' },
                                        limit: { type: 'integer' },
                                        forceRefresh: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Collection started',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            results: {
                                                type: 'object',
                                                properties: {
                                                    collected: { type: 'integer' },
                                                    saved: { type: 'integer' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/public/triggers/data-collection': {
                post: {
                    operationId: 'triggerDataCollection',
                    summary: 'Trigger data collection',
                    description: 'Trigger automated data collection from parliamentary sources.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        type: {
                                            type: 'string',
                                            enum: ['full', 'deputies', 'incremental', 'senators'],
                                            default: 'incremental'
                                        },
                                        limit: {
                                            type: 'integer',
                                            minimum: 1,
                                            maximum: 1000
                                        },
                                        forceRefresh: {
                                            type: 'boolean',
                                            default: false
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Collection started successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                get: {
                    operationId: 'getDataCollectionInfo',
                    summary: 'Get data collection info',
                    description: 'Get information about available data collection types.',
                    responses: {
                        '200': {
                            description: 'Successful response',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    availableTypes: {
                                                        type: 'array',
                                                        items: {
                                                            type: 'object',
                                                            properties: {
                                                                type: { type: 'string' },
                                                                description: { type: 'string' }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/public/triggers/match-promises': {
                post: {
                    operationId: 'matchPromises',
                    summary: 'Match promises',
                    description: 'Trigger semantic matching of promises to parliamentary actions.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['politicianId'],
                                    properties: {
                                        politicianId: { type: 'string', format: 'uuid' },
                                        minConfidence: { type: 'number', default: 0.6 }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Matching completed',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    matched: { type: 'integer' },
                                                    autoVerified: { type: 'integer' },
                                                    needsReview: { type: 'integer' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/public/triggers/calculate-scores': {
                post: {
                    operationId: 'calculateScores',
                    summary: 'Calculate scores',
                    description: 'Trigger consistency score calculation for a politician.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['politicianId'],
                                    properties: {
                                        politicianId: { type: 'string', format: 'uuid' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Calculation completed',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/ConsistencyScores' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/public/triggers/politician-audit': {
                post: {
                    operationId: 'triggerPoliticianAudit',
                    summary: 'Trigger politician audit',
                    description: 'Run a comprehensive audit for a specific politician, including news search, promise extraction, and scoring.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['politicianId'],
                                    properties: {
                                        politicianId: {
                                            type: 'string',
                                            format: 'uuid',
                                            description: 'ID of the politician to audit'
                                        },
                                        includeNewsSearch: {
                                            type: 'boolean',
                                            default: true
                                        },
                                        newsSearchQuery: {
                                            type: 'string',
                                            description: 'Optional custom query for news search'
                                        },
                                        timeframe: {
                                            type: 'string',
                                            enum: ['week', 'month', 'quarter', 'year', 'all'],
                                            default: 'month'
                                        },
                                        minConfidence: {
                                            type: 'number',
                                            minimum: 0,
                                            maximum: 1,
                                            default: 0.6
                                        },
                                        generateReport: {
                                            type: 'boolean',
                                            default: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Audit completed successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            audit: { $ref: '#/components/schemas/AuditResult' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return NextResponse.json(spec)
}
