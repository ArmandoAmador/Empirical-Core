import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router'
import {hashToCollection} from '../../libs/hashToCollection'
import _ from 'underscore'
import QuestionsList from './../questions/questionsList.jsx'

const play = React.createClass({
  render: function () {
    const {questions, concepts} = this.props
    return (
      <section className="section is-fullheight minus-nav">
        <div className="container">
          <h1 className="title">
            Choose a Question
          </h1>
          <h2 className="subtitle">
            Combine multiple sentences into one strong one!
          </h2>
          <QuestionsList displayNoConceptQuestions={false} questions={questions} concepts={concepts} baseRoute={"play"} />
        </div>
      </section>
    )
  }
})

function select(state) {
  return {
    concepts: state.concepts,
    questions: state.questions,
    routing: state.routing
  }
}

export default connect(select)(play)