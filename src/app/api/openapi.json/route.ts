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
