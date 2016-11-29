import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router'
import questionActions from '../../actions/questions'
import _ from 'underscore'
import {hashToCollection} from '../../libs/hashToCollection'
import Response from '../questions/response.jsx'
import {
  loadResponseDataAndListen,
  stopListeningToResponses
} from '../../actions/responses'
import C from '../../constants'
import SharedSection from '../shared/section.jsx'
import Chart from '../questions/pieChart.jsx'
import ResponseComponent from '../questions/responseComponent.jsx'
const labels = ["Human Optimal", "Human Sub-Optimal", "Algorithm Optimal", "Algorithm Sub-Optimal",  "Unmatched"]
const colors = ["#81c784", "#ffb74d", "#ba68c8", "#5171A5", "#e57373"]

const Review = React.createClass({

  componentWillMount: function () {
    const {questionID} = this.props.params;
    this.props.dispatch(loadResponseDataAndListen(questionID))
  },

  componentWillUnmount: function () {
    console.log("Unmounting");
    const {questionID} = this.props.params;
    this.props.dispatch(stopListeningToResponses(questionID))
  },

  deleteQuestion: function () {
    this.props.dispatch(questionActions.deleteQuestion(this.props.params.questionID))
  },

  startEditingQuestion: function () {
    this.props.dispatch(questionActions.startQuestionEdit(this.props.params.questionID))
  },

  cancelEditingQuestion: function () {
    this.props.dispatch(questionActions.cancelQuestionEdit(this.props.params.questionID))
  },

  saveQuestionEdits: function (vals) {
    this.props.dispatch(questionActions.submitQuestionEdit(this.props.params.questionID, vals))
  },

  getResponses: function () {
    const {questionID} = this.props.params;
    return this.props.responses.data[questionID]
  },

  getResponse: function (responseID) {
    const {data, states} = this.props.questions, {questionID} = this.props.params;
    var responses = hashToCollection(this.getResponses())
    return _.find(responses, {key: responseID})
  },

  submitNewResponse: function () {
    var newResp = {
      vals: {
        text: this.refs.newResponseText.value,
        feedback: this.refs.newResponseFeedback.value,
        optimal: this.refs.newResponseOptimal.checked
      },
      questionID: this.props.params.questionID
    }
    this.props.dispatch(questionActions.submitNewResponse(newResp.questionID, newResp.vals))
  },

  responsesWithStatus: function () {
    const {data, states} = this.props.questions, {questionID} = this.props.params;
    var responses = hashToCollection(this.getResponses())
    return responses.map((response) => {
      var statusCode;
      if (!response.feedback) {
        statusCode = 4;
      } else if (!!response.parentID) {
        var parentResponse = this.getResponse(response.parentID)
        statusCode = 3;
      } else {
        statusCode = (response.optimal ? 0 : 1);
      }
      response.statusCode = statusCode
      return response
    })
  },

  responsesGroupedByStatus: function () {
    return _.groupBy(this.responsesWithStatus(), 'statusCode')
  },

  responsesFromAlgorithms: function () {
    const responses = this.responsesGroupedByStatus()
    return responses["3"]
  },

  responsesGroupedByAuthor: function () {
    return _.groupBy(this.responsesFromAlgorithms(), 'author')
  },

  responsesByAuthorAndResponseCount: function () {
    return _.mapObject(this.responsesGroupedByAuthor(), (val, key) => {
      return _.reduce(val, (memo, resp) => {
        return memo + 1
      }, 0)
    })
  },

  responsesByStatusCodeAndResponseCount: function () {
    return _.mapObject(this.responsesGroupedByStatus(), (val, key) => {
      return _.reduce(val, (memo, resp) => {

        return memo + (resp.count || 0)
      }, 0)
    })
  },

  getTotalValue: function(data) {
    const values = _.map(data, (obj) => obj.value);
    return _.reduce(values, (memo, val) => memo + val, 0)
  },

  formatForPieChart: function () {
    return _.mapObject(this.responsesByStatusCodeAndResponseCount(), (val, key) => {
      return {
        value: val,
        label: labels[key],
        color: colors[key]
      }
    })
  },

  formatForAlgorithmPieChart: function () {
    return _.mapObject(this.responsesByAuthorAndResponseCount(), (val, key, object) => {
      const index = _.keys(object).indexOf(key);
      return {
        value: val,
        label: key,
        color: colors[index]
      }
    })
  },

  render: function (){
    const {data, states} = this.props.questions, {questionID} = this.props.params;
    if (data[questionID]) {
      var responses = hashToCollection(this.getResponses())
      const correctnessPieChartData = _.values(this.formatForPieChart());
      const hintTypePieChartData = _.values(this.formatForAlgorithmPieChart());
      return (
        <SharedSection>
          <h4 className="title">{data[questionID].prompt.replace(/(<([^>]+)>)/ig, "").replace(/&nbsp;/ig, "")}</h4>
          <h6 className="subtitle">{responses.length} Responses</h6>
          <Link to={'play/questions/' + questionID} className="button is-outlined is-primary">Play Question</Link><br/><br/>
          <div className='columns'>
            <div className='column is-half'>
              <Chart
                data={correctnessPieChartData}
                total={this.getTotalValue(correctnessPieChartData)}
              />
            </div>
            <div className='column is-half'>
              <Chart
                data={hintTypePieChartData}
                total={this.getTotalValue(hintTypePieChartData)}
              />
            </div>
          </div>

          <ResponseComponent
            question={data[questionID]}
            responses={this.getResponses()}
            questionID={questionID}
            states={states}
            dispatch={this.props.dispatch}
            admin={false}/>
        </SharedSection>
      )
    } else if (this.props.questions.hasreceiveddata === false){
      return (<p>Loading...</p>)
    } else {
      return (
        <p>404: No Question Found</p>
      )
    }

  }
})

function select(state) {
  return {
    concepts: state.concepts,
    questions: state.questions,
    routing: state.routing,
    responses: state.responses
  }
}

export default connect(select)(Review)
