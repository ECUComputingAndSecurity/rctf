import withStyles from './jss'

const Footer = ({ classes }) => (
  <div class={classes.root}>
    <span>
      Built by <a href='https://tplant.com.au/' target='_blank' rel='noopener noreferrer'>Tom Plant
      </a> with <a href='https://rctf.redpwn.net/' target='_blank' rel='noopener noreferrer'>rCTF
      </a> and <a href='https://azure.com/' target='_blank' rel='noopener noreferrer'>Azure</a>
    </span>
  </div>
)

export default withStyles({
  root: {
    display: 'flex',
    justifyContent: 'center',
    padding: '1rem',
    '& a': {
      display: 'inline',
      padding: 0
    },
    fontSize: '0.85rem',
    opacity: 0.7,
    '&:hover': {
      opacity: 1
    },
    transition: 'opacity 300ms ease'
  }
}, Footer)
