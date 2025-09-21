"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { mlThreatDetector } from '@/lib/ml-threat-detector'
import type { ThreatDetectionResult, NetworkAnalysis } from '@/lib/ml-threat-detector'
import {
  Shield,
  AlertTriangle,
  Bot,
  Users,
  Activity,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Network,
  Target,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface ThreatAlert {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  user_id?: string
  content_id?: string
  detected_at: string
  status: 'active' | 'investigating' | 'resolved' | 'false_positive'
  ml_confidence: number
}

export function ThreatMonitoring() {
  const [threats, setThreats] = useState<ThreatAlert[]>([])
  const [networkAnalysis, setNetworkAnalysis] = useState<NetworkAnalysis | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'network' | 'analytics'>('overview')

  useEffect(() => {
    fetchThreatData()
    startMonitoring()
  }, [])

  const fetchThreatData = async () => {
    try {
      setLoading(true)

      // Simulate fetching threat data
      const mockThreats: ThreatAlert[] = [
        {
          id: '1',
          type: 'coordinated_behavior',
          severity: 'high',
          description: 'Détection de comportement coordonné entre 15 comptes',
          user_id: 'user_123',
          detected_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          status: 'active',
          ml_confidence: 0.87
        },
        {
          id: '2',
          type: 'bot_activity',
          severity: 'medium',
          description: 'Activité suspecte de bot détectée',
          user_id: 'user_456',
          detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'investigating',
          ml_confidence: 0.74
        },
        {
          id: '3',
          type: 'disinformation',
          severity: 'critical',
          description: 'Propagation de désinformation détectée',
          content_id: 'vote_789',
          detected_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          status: 'active',
          ml_confidence: 0.92
        }
      ]

      setThreats(mockThreats)

      // Fetch network analysis
      const analysis = await mlThreatDetector.analyzeNetworkThreats()
      setNetworkAnalysis(analysis)

    } catch (error) {
      console.error('Error fetching threat data:', error)
    } finally {
      setLoading(false)
    }
  }

  const startMonitoring = async () => {
    setIsMonitoring(true)
    await mlThreatDetector.startRealTimeMonitoring()
  }

  const stopMonitoring = async () => {
    setIsMonitoring(false)
    await mlThreatDetector.stopRealTimeMonitoring()
  }

  const updateThreatStatus = async (threatId: string, status: ThreatAlert['status']) => {
    setThreats(prev => prev.map(threat =>
      threat.id === threatId ? { ...threat, status } : threat
    ))
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800 border-red-200'
      case 'investigating': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
      case 'false_positive': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getThreatIcon = (type: string) => {
    switch (type) {
      case 'bot_activity': return <Bot className="w-4 h-4" />
      case 'coordinated_behavior': return <Users className="w-4 h-4" />
      case 'disinformation': return <AlertTriangle className="w-4 h-4" />
      case 'spam': return <Zap className="w-4 h-4" />
      case 'manipulation': return <Target className="w-4 h-4" />
      default: return <Shield className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Surveillance des menaces</h2>
          <p className="text-gray-600">Détection automatisée des menaces par IA</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
            isMonitoring ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            <Activity className={`w-4 h-4 ${isMonitoring ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium">
              {isMonitoring ? 'Surveillance active' : 'Surveillance arrêtée'}
            </span>
          </div>
          <Button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
          >
            {isMonitoring ? 'Arrêter' : 'Démarrer'}
          </Button>
          <Button onClick={fetchThreatData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Menaces actives</p>
                <p className="text-2xl font-bold text-red-600">
                  {threats.filter(t => t.status === 'active').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bots détectés</p>
                <p className="text-2xl font-bold text-orange-600">
                  {threats.filter(t => t.type === 'bot_activity').length}
                </p>
              </div>
              <Bot className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Réseaux suspects</p>
                <p className="text-2xl font-bold text-purple-600">
                  {networkAnalysis?.suspicious_clusters.length || 0}
                </p>
              </div>
              <Network className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confiance IA</p>
                <p className="text-2xl font-bold text-blue-600">
                  {threats.length > 0
                    ? Math.round(threats.reduce((sum, t) => sum + t.ml_confidence, 0) / threats.length * 100)
                    : 0}%
                </p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Vue d\'ensemble', icon: <Shield className="w-4 h-4" /> },
            { key: 'threats', label: 'Menaces', icon: <AlertTriangle className="w-4 h-4" /> },
            { key: 'network', label: 'Analyse réseau', icon: <Network className="w-4 h-4" /> },
            { key: 'analytics', label: 'Analytics ML', icon: <TrendingUp className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Menaces récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {threats.slice(0, 5).map((threat) => (
                  <div key={threat.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getThreatIcon(threat.type)}
                      <div>
                        <p className="text-sm font-medium">{threat.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(threat.detected_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getSeverityColor(threat.severity)}>
                        {threat.severity}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {Math.round(threat.ml_confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analyse de tendances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Activité bot</span>
                    <span>23%</span>
                  </div>
                  <Progress value={23} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Coordination suspecte</span>
                    <span>45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Désinformation</span>
                    <span>12%</span>
                  </div>
                  <Progress value={12} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Manipulation</span>
                    <span>31%</span>
                  </div>
                  <Progress value={31} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'threats' && (
        <div className="space-y-4">
          {threats.map((threat) => (
            <Card key={threat.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      threat.severity === 'critical' ? 'bg-red-100 text-red-600' :
                      threat.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                      threat.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {getThreatIcon(threat.type)}
                    </div>
                    <div>
                      <h3 className="font-medium">{threat.description}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Type: {threat.type}</span>
                        <span>Confiance: {Math.round(threat.ml_confidence * 100)}%</span>
                        <span>{new Date(threat.detected_at).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={getSeverityColor(threat.severity)}>
                      {threat.severity}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(threat.status)}>
                      {threat.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => updateThreatStatus(threat.id, 'investigating')}
                    size="sm"
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Enquêter
                  </Button>
                  <Button
                    onClick={() => updateThreatStatus(threat.id, 'resolved')}
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Résolu
                  </Button>
                  <Button
                    onClick={() => updateThreatStatus(threat.id, 'false_positive')}
                    size="sm"
                    variant="outline"
                    className="text-gray-600 hover:text-gray-700"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Faux positif
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'network' && (
        <div className="space-y-6">
          {networkAnalysis && (
            <>
              {/* Suspicious Clusters */}
              <Card>
                <CardHeader>
                  <CardTitle>Clusters suspects</CardTitle>
                </CardHeader>
                <CardContent>
                  {networkAnalysis.suspicious_clusters.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Aucun cluster suspect détecté</p>
                  ) : (
                    <div className="space-y-4">
                      {networkAnalysis.suspicious_clusters.map((cluster) => (
                        <div key={cluster.cluster_id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Cluster {cluster.cluster_id}</h4>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700">
                              {cluster.size} membres
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Score de coordination: {Math.round(cluster.coordination_score * 100)}%
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {cluster.behavior_patterns.map((pattern, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {pattern}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bot Networks */}
              <Card>
                <CardHeader>
                  <CardTitle>Réseaux de bots</CardTitle>
                </CardHeader>
                <CardContent>
                  {networkAnalysis.bot_networks.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Aucun réseau de bots détecté</p>
                  ) : (
                    <div className="space-y-4">
                      {networkAnalysis.bot_networks.map((network) => (
                        <div key={network.network_id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Réseau {network.network_id}</h4>
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              Confiance: {Math.round(network.confidence * 100)}%
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {network.evidence.map((evidence, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {evidence}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <Card>
          <CardHeader>
            <CardTitle>Analytics Machine Learning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Analytics ML avancées</h3>
              <p className="text-sm">Analyses détaillées et métriques de performance des modèles à venir.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}