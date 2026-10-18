class PromptTemplates {
  static getSystemPrompt() {
    return `You are the Audience Intelligence Assistant for the Web Series Insight Platform.
Your role is to provide data-driven, explainable insights about web series audiences.

Rules:
1. Base every answer on the provided review data, insights, and audience metrics
2. Always include 2-3 specific review snippets as evidence
3. Cite sentiment percentages, emotion data, and topic data when available
4. Be honest if data is limited — say so, but still provide what you can
5. Keep responses clear and structured (2-3 paragraphs max)
6. Never fabricate audience demographics or preferences
7. Focus on WHY and HOW audiences respond, not just what they watch`
  }

  // Build context from both vector store results AND direct MongoDB data
  static buildContext(vectorDocs, searchMeta, mongoDocs = [], conversationHistory = []) {
    let context = ''

    // Conversation memory
    if (conversationHistory.length > 0) {
      context += '## Conversation History (for follow-up context):\n'
      conversationHistory.forEach(h => {
        context += `Q: ${h.question}\nA: ${h.answer.substring(0, 200)}...\n\n`
      })
    }

    // Direct MongoDB data (always present)
    if (mongoDocs.length > 0) {
      context += '## Series Audience Data (from database):\n\n'
      mongoDocs.forEach(s => {
        context += `### ${s.seriesTitle}\n`
        context += `- Rating: ${s.averageRating}/10 | Total Reviews: ${s.totalReviews}\n`

        if (s.whyLiked?.length > 0) context += `- Why audiences like it: ${s.whyLiked.join('; ')}\n`
        if (s.whyDisliked?.length > 0) context += `- Common criticisms: ${s.whyDisliked.join('; ')}\n`
        if (s.keyThemes?.length > 0) context += `- Key themes: ${s.keyThemes.join(', ')}\n`
        if (s.audienceType) context += `- Audience type: ${s.audienceType}\n`
        if (s.engagementLevel) context += `- Engagement: ${s.engagementLevel}\n`
        if (s.emotionalResponse) context += `- Emotional response: ${s.emotionalResponse}\n`
        if (s.emotionalJourney?.length > 0) context += `- Emotional journey: ${s.emotionalJourney.join(' → ')}\n`

        const dna = s.contentDNA || {}
        if (Object.keys(dna).length > 0) {
          context += `- Content DNA: Pacing=${dna.pacing}, Complexity=${dna.complexity}, EmotionalDepth=${dna.emotionalDepth}, Narrative=${dna.narrativeStyle}\n`
        }

        const sb = s.sentimentBreakdown || {}
        if (sb.highPositive !== undefined) {
          context += `- Sentiment: ${sb.highPositive}% very positive, ${sb.positive}% positive, ${sb.neutral}% neutral, ${sb.negative}% negative\n`
        }
        if (s.topTopics?.length > 0) context += `- Top discussed topics: ${s.topTopics.join(', ')}\n`
        if (s.topEmotions?.length > 0) context += `- Top emotions: ${s.topEmotions.join(', ')}\n`

        if (s.reviewSnippets?.length > 0) {
          context += `- Review evidence:\n`
          s.reviewSnippets.slice(0, 3).forEach((r, i) => {
            const sentLabel = r.sentiment > 0.3 ? 'positive' : r.sentiment < -0.3 ? 'negative' : 'neutral'
            context += `  ${i + 1}. "${r.text}" [${sentLabel}, rating: ${r.rating || 'N/A'}]\n`
          })
        }
        context += '\n'
      })
    }

    // Vector store results (bonus context when available)
    const vectorTypes = Object.keys(vectorDocs)
    if (vectorTypes.length > 0) {
      context += '## Additional Vector Search Results:\n\n'
      vectorTypes.forEach(type => {
        if (vectorDocs[type]?.length > 0) {
          context += `### ${type.replace(/_/g, ' ').toUpperCase()}:\n`
          vectorDocs[type].slice(0, 3).forEach((doc, i) => {
            context += `${i + 1}. ${doc.text.substring(0, 400)}\n`
          })
          context += '\n'
        }
      })
    }

    return context
  }

  static buildWhyPrompt(question, context, seriesName = '') {
    return `Question: ${question}

${context}

Based on the audience data above, explain with specific evidence:
1. The main reasons (backed by review data and sentiment)
2. Specific themes or patterns audiences highlight
3. Emotional responses from viewers
4. Include 2-3 direct review quotes as evidence

Be specific about percentages and data points.`
  }

  static buildComparisonPrompt(seriesList, question, context) {
    return `Question: ${question}
Series to compare: ${seriesList.join(' vs ')}

${context}

Compare these series on:
1. Audience demographics and preferences
2. Sentiment and engagement differences
3. Key themes each audience values
4. Emotional tone differences
5. Which audience segment prefers each

Use specific data points and review evidence for each series.`
  }

  static buildPersonaPrompt(question, context) {
    return `Question: ${question}

${context}

Describe the audience profile:
1. Audience type and engagement style
2. What they value most in this series
3. Key themes and emotions that resonate
4. Sentiment patterns from this audience
5. Include specific review evidence showing who is watching and why`
  }

  static buildRecommendationPrompt(recommendedSeries, baseSeries, context) {
    return `Question: Why is "${recommendedSeries}" recommended to people who watch "${baseSeries}"?

${context}

Explain using data:
1. Shared audience preferences
2. Similar themes and content DNA
3. Matching emotional tone
4. Specific review evidence showing the overlap`
  }

  // Format sources for the API response
  static formatSources(vectorDocs, mongoDocs, seriesList) {
    const sources = {}

    // Sources from vector store
    Object.keys(vectorDocs).forEach(type => {
      if (vectorDocs[type]?.length > 0) {
        sources[type] = vectorDocs[type].slice(0, 3).map(doc => ({
          seriesTitle: doc.metadata?.seriesTitle || 'Unknown',
          documentType: doc.metadata?.documentType || type,
          similarity: doc.similarity || 0,
          preview: doc.text ? doc.text.substring(0, 150) + '...' : '',
          content: doc.text || ''
        }))
      }
    })

    // Sources from direct MongoDB (always shown)
    if (mongoDocs?.length > 0) {
      sources['mongodb_insights'] = mongoDocs.map(s => ({
        seriesTitle: s.seriesTitle,
        documentType: 'insight',
        similarity: 1.0,
        preview: s.whyLiked?.slice(0, 2).join('; ') || s.audienceType || 'Direct MongoDB data',
        content: [
          s.whyLiked?.length ? `Why Liked: ${s.whyLiked.join('; ')}` : '',
          s.whyDisliked?.length ? `Why Disliked: ${s.whyDisliked.join('; ')}` : '',
          s.keyThemes?.length ? `Key Themes: ${s.keyThemes.join(', ')}` : '',
          s.audienceType ? `Audience Type: ${s.audienceType}` : '',
          s.engagementLevel ? `Engagement Level: ${s.engagementLevel}` : '',
          s.emotionalResponse ? `Emotional Response: ${s.emotionalResponse}` : ''
        ].filter(Boolean).join('\n')
      }))

      if (mongoDocs.some(s => s.reviewSnippets?.length > 0)) {
        sources['mongodb_reviews'] = mongoDocs.flatMap(s =>
          (s.reviewSnippets || []).slice(0, 2).map(r => ({
            seriesTitle: s.seriesTitle,
            documentType: 'review',
            similarity: 1.0,
            preview: r.text.substring(0, 150) + '...',
            content: r.text || ''
          }))
        )
      }
    }

    return sources
  }

  static calculateConfidence(vectorDocs, answer) {
    // Legacy method kept for compatibility — main confidence calc is in ragService
    let confidence = 50
    const totalDocs = Object.values(vectorDocs).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    confidence += Math.min(totalDocs * 8, 30)
    if (answer?.length > 500) confidence += 10
    if (answer?.length > 800) confidence += 10
    return Math.min(confidence, 100)
  }
}

module.exports = PromptTemplates
